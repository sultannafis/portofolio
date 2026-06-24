package repositories

import (
	"crypto/rand"
	"errors"
	"fmt"
	"math/big"
	"time"

	"github.com/google/uuid"
	"github.com/portfolio/backend/internal/models"
	"github.com/portfolio/backend/internal/utils"
	"gorm.io/gorm"
)

type SecurityOTPRepo struct {
	db *gorm.DB
}

func NewSecurityOTPRepo(db *gorm.DB) *SecurityOTPRepo {
	return &SecurityOTPRepo{db: db}
}

// GenerateRandomOTP generates a secure 6-digit numeric OTP (e.g., "004921").
func (r *SecurityOTPRepo) GenerateRandomOTP() (string, error) {
	max := big.NewInt(1000000)
	n, err := rand.Int(rand.Reader, max)
	if err != nil {
		return "", err
	}
	return fmt.Sprintf("%06d", n.Int64()), nil
}

// CreateOTP generates, hashes, and stores an OTP. The raw OTP is returned to be sent via external means securely.
func (r *SecurityOTPRepo) CreateOTP(userID *uuid.UUID, otpType string, pendingAction, pendingPayload string, maxAttempts int, expiresAt time.Time) (string, uuid.UUID, error) {
	if otpType != "login_otp" && otpType != "security_setting_change" && otpType != "account_setting_change" {
		return "", uuid.Nil, errors.New("invalid OTP type")
	}

	rawOTP, err := r.GenerateRandomOTP()
	if err != nil {
		return "", uuid.Nil, err
	}

	hashedOTP, err := utils.HashPassword(rawOTP)
	if err != nil {
		return "", uuid.Nil, err
	}

	otpModel := models.SecurityOTP{
		UserID:         userID,
		OTPHash:        hashedOTP,
		Type:           otpType,
		PendingAction:  pendingAction,
		PendingPayload: pendingPayload,
		ExpiresAt:      expiresAt,
		Attempts:       0,
		MaxAttempts:    maxAttempts,
	}

	if err := r.db.Create(&otpModel).Error; err != nil {
		return "", uuid.Nil, err
	}

	return rawOTP, otpModel.ID, nil
}

// VerifyOTP checks the validity and expiration of the OTP, and updates attempts if wrong.
func (r *SecurityOTPRepo) VerifyOTP(otpID uuid.UUID, rawOTP string, otpType string) (bool, *models.SecurityOTP, error) {
	var otpModel models.SecurityOTP
	if err := r.db.Where("id = ? AND type = ?", otpID, otpType).First(&otpModel).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return false, nil, errors.New("invalid OTP or expired request")
		}
		return false, nil, err
	}

	// Safely clean up immediately if expired to save manual cleanup logic in handlers
	if time.Now().After(otpModel.ExpiresAt) {
		r.DeleteOTP(otpModel.ID)
		return false, nil, errors.New("OTP has expired")
	}

	if otpModel.Attempts >= otpModel.MaxAttempts {
		r.DeleteOTP(otpModel.ID)
		return false, nil, errors.New("too many failed attempts, OTP invalidated")
	}

	// Verify Hash
	if !utils.CheckPassword(rawOTP, otpModel.OTPHash) {
		r.IncrementAttempts(otpModel.ID)
		
		// Re-evaluate attempts after increment if we just hit max
		if otpModel.Attempts+1 >= otpModel.MaxAttempts {
			r.DeleteOTP(otpModel.ID)
			return false, nil, errors.New("too many failed attempts, OTP invalidated")
		}
		
		return false, nil, errors.New("invalid OTP code")
	}

	// Success match
	return true, &otpModel, nil
}

// IncrementAttempts increments the attempt counter for an OTP.
func (r *SecurityOTPRepo) IncrementAttempts(otpID uuid.UUID) error {
	return r.db.Model(&models.SecurityOTP{}).Where("id = ?", otpID).Update("attempts", gorm.Expr("attempts + 1")).Error
}

// DeleteOTP deletes the OTP directly via its primary key.
func (r *SecurityOTPRepo) DeleteOTP(otpID uuid.UUID) error {
	return r.db.Delete(&models.SecurityOTP{}, "id = ?", otpID).Error
}

// CleanupExpiredOTPs safely deletes all OTP records that have expired. 
func (r *SecurityOTPRepo) CleanupExpiredOTPs() error {
	return r.db.Where("expires_at < ?", time.Now()).Delete(&models.SecurityOTP{}).Error
}
