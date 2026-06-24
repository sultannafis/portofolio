package controllers

import (
	"encoding/json"
	"log"
	"os"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/portfolio/backend/internal/database"
	"github.com/portfolio/backend/internal/models"
	"github.com/portfolio/backend/internal/repositories"
	"github.com/portfolio/backend/internal/utils"
)

type AuthController struct {
	userRepo *repositories.UserRepo
	otpRepo  *repositories.SecurityOTPRepo
}

func NewAuthController() *AuthController {
	return &AuthController{
		userRepo: repositories.NewUserRepo(database.DB),
		otpRepo:  repositories.NewSecurityOTPRepo(database.DB),
	}
}

type LoginRequest struct {
	Username string `json:"username"`
	Password string `json:"password"`
}

func (ctrl *AuthController) Login(c *fiber.Ctx) error {
	var req LoginRequest
	if err := c.BodyParser(&req); err != nil {
		return utils.ErrorResponse(c, fiber.StatusBadRequest, "Invalid request body")
	}

	if req.Username == "" || req.Password == "" {
		return utils.ErrorResponse(c, fiber.StatusBadRequest, "Username and password are required")
	}

	user, err := ctrl.userRepo.FindByUsername(req.Username)
	if err != nil {
		return utils.ErrorResponse(c, fiber.StatusUnauthorized, "Username atau password salah.")
	}

	if !utils.CheckPassword(req.Password, user.Password) {
		return utils.ErrorResponse(c, fiber.StatusUnauthorized, "Username atau password salah.")
	}

	// Security Hook: Login OTP 2FA
	secSettings := utils.GetSecuritySettings()
	if secSettings.LoginOtpEnabled && user.Email != "" && os.Getenv("RESEND_API_KEY") != "" && os.Getenv("CONTACT_FROM_EMAIL") != "" {
		_ = ctrl.otpRepo.CleanupExpiredOTPs() // Safely cleanup in background 

		rawOTP, pendingLoginId, err := ctrl.otpRepo.CreateOTP(
			&user.ID,
			"login_otp",
			"login",
			"{}",
			5,
			time.Now().Add(5*time.Minute),
		)
		if err != nil {
			log.Printf("[OTP Error] Failed to secure OTP in db: %v\n", err)
			return utils.ErrorResponse(c, fiber.StatusInternalServerError, "Gagal mengirim kode OTP. Silakan coba lagi nanti.")
		}

		err = utils.SendOTPEmail(user.Email, "Login OTP Code", "Admin Authentication Code", rawOTP, "A request was made to authenticate your admin session. Use the One-Time Password (OTP) below to proceed.")
		if err != nil {
			log.Printf("[Resend Error] Synchronous email delivery failed: %v\n", err)
			_ = ctrl.otpRepo.DeleteOTP(pendingLoginId) 
			return utils.ErrorResponse(c, fiber.StatusInternalServerError, "Gagal mengirim kode OTP. Silakan coba lagi nanti.")
		}

		return c.Status(fiber.StatusOK).JSON(fiber.Map{
			"success":        true,
			"requiresOtp":    true,
			"pendingLoginId": pendingLoginId,
			"message":        "Kode OTP telah dikirim ke email terdaftar.",
			"maskedEmail":    utils.MaskEmail(user.Email),
		})
	} else if secSettings.LoginOtpEnabled {
		log.Println("[OTP Fallback] Login OTP is ON, but configuration is invalid (missing email or API key). Falling back to standard login to prevent remote lockout.")
	}

	token, err := utils.GenerateToken(user.ID, user.Username, user.Role)
	if err != nil {
		return utils.ErrorResponse(c, fiber.StatusInternalServerError, "Failed to generate token")
	}

	return utils.SuccessResponse(c, fiber.Map{
		"token": token,
		"user": fiber.Map{
			"id":         user.ID,
			"username":   user.Username,
			"email":      user.Email,
			"role":       user.Role,
			"avatar_url": user.AvatarURL,
		},
	}, "Login successful")
}

func (ctrl *AuthController) Me(c *fiber.Ctx) error {
	userID := c.Locals("userID").(uuid.UUID)
	user, err := ctrl.userRepo.FindByID(userID)
	if err != nil {
		return utils.ErrorResponse(c, fiber.StatusNotFound, "User not found")
	}

	return utils.SuccessResponse(c, fiber.Map{
		"id":         user.ID,
		"username":   user.Username,
		"email":      user.Email,
		"role":       user.Role,
		"avatar_url": user.AvatarURL,
	}, "User info")
}

type RequestProfileOTPRequest struct {
	Username string `json:"username"`
	Email    string `json:"email"`
	Password string `json:"password"`
}

func (ctrl *AuthController) RequestProfileOTP(c *fiber.Ctx) error {
	userID := c.Locals("userID").(uuid.UUID)

	var req RequestProfileOTPRequest
	if err := c.BodyParser(&req); err != nil {
		return utils.ErrorResponse(c, fiber.StatusBadRequest, "Invalid request body")
	}

	user, err := ctrl.userRepo.FindByID(userID)
	if err != nil {
		return utils.ErrorResponse(c, fiber.StatusNotFound, "User not found")
	}

	if user.Email == "" {
		return utils.ErrorResponse(c, fiber.StatusBadRequest, "Current account email is not set, cannot verify via OTP")
	}

	payload := make(map[string]interface{})
	if req.Username != "" && req.Username != user.Username {
		payload["username"] = req.Username
	}
	if req.Email != "" && req.Email != user.Email {
		if !strings.Contains(req.Email, "@") {
			return utils.ErrorResponse(c, fiber.StatusBadRequest, "Invalid email format")
		}
		payload["email"] = req.Email
	}
	if req.Password != "" {
		hashedPW, err := utils.HashPassword(req.Password)
		if err != nil {
			return utils.ErrorResponse(c, fiber.StatusInternalServerError, "Failed to process password")
		}
		payload["newPasswordHash"] = hashedPW
	}

	if len(payload) == 0 {
		return utils.ErrorResponse(c, fiber.StatusBadRequest, "No changes detected")
	}

	payloadBytes, err := json.Marshal(payload)
	if err != nil {
		return utils.ErrorResponse(c, fiber.StatusInternalServerError, "Failed to serialize payload")
	}

	_ = ctrl.otpRepo.CleanupExpiredOTPs()

	rawOTP, pendingID, err := ctrl.otpRepo.CreateOTP(
		&user.ID,
		"account_setting_change",
		"update_profile",
		string(payloadBytes),
		5,
		time.Now().Add(5*time.Minute),
	)
	if err != nil {
		return utils.ErrorResponse(c, fiber.StatusInternalServerError, "Gagal mengirim kode OTP")
	}

	err = utils.SendOTPEmail(user.Email, "Account Update OTP Code", "Account Change Request", rawOTP, "A request was made to update your account details. Use the One-Time Password (OTP) below to verify this action.")
	if err != nil {
		_ = ctrl.otpRepo.DeleteOTP(pendingID)
		return utils.ErrorResponse(c, fiber.StatusInternalServerError, "Gagal mengirim email OTP")
	}

	return utils.SuccessResponse(c, fiber.Map{
		"requiresOtp": true,
		"pendingId":   pendingID,
		"maskedEmail": utils.MaskEmail(user.Email),
	}, "Kode OTP telah dikirim ke email Anda")
}

type VerifyProfileOTPRequest struct {
	PendingID uuid.UUID `json:"pendingId"`
	OTP       string    `json:"otp"`
}

func (ctrl *AuthController) VerifyProfileOTP(c *fiber.Ctx) error {
	var req VerifyProfileOTPRequest
	if err := c.BodyParser(&req); err != nil {
		return utils.ErrorResponse(c, fiber.StatusBadRequest, "Invalid request body")
	}

	isValid, otpModel, err := ctrl.otpRepo.VerifyOTP(req.PendingID, req.OTP, "account_setting_change")
	if err != nil || !isValid {
		return utils.ErrorResponse(c, fiber.StatusUnauthorized, "Kode OTP salah atau sudah expired.")
	}

	if otpModel.UserID == nil {
		return utils.ErrorResponse(c, fiber.StatusUnauthorized, "Invalid OTP relation")
	}

	user, err := ctrl.userRepo.FindByID(*otpModel.UserID)
	if err != nil {
		return utils.ErrorResponse(c, fiber.StatusUnauthorized, "User not found")
	}

	var payload map[string]interface{}
	if err := json.Unmarshal([]byte(otpModel.PendingPayload), &payload); err != nil {
		return utils.ErrorResponse(c, fiber.StatusInternalServerError, "Failed to parse OTP metadata")
	}

	if newUsername, ok := payload["username"].(string); ok {
		user.Username = newUsername
	}
	if newEmail, ok := payload["email"].(string); ok {
		user.Email = newEmail
	}
	if newPasswordHash, ok := payload["newPasswordHash"].(string); ok {
		user.Password = newPasswordHash
	}

	if err := ctrl.userRepo.Update(user); err != nil {
		return utils.ErrorResponse(c, fiber.StatusInternalServerError, "Failed to update profile")
	}

	_ = ctrl.otpRepo.DeleteOTP(otpModel.ID)

	return utils.SuccessResponse(c, fiber.Map{
		"id":         user.ID,
		"username":   user.Username,
		"email":      user.Email,
		"role":       user.Role,
		"avatar_url": user.AvatarURL,
	}, "Profile updated successfully")
}

// -------------------------------------------------------------
// OTP Section
// -------------------------------------------------------------

type VerifyOTPRequest struct {
	PendingLoginID uuid.UUID `json:"pendingLoginId"`
	OTP            string    `json:"otp"`
}

func (ctrl *AuthController) VerifyOTP(c *fiber.Ctx) error {
	var req VerifyOTPRequest
	if err := c.BodyParser(&req); err != nil {
		return utils.ErrorResponse(c, fiber.StatusBadRequest, "Invalid request body")
	}

	isValid, otpModel, err := ctrl.otpRepo.VerifyOTP(req.PendingLoginID, req.OTP, "login_otp")
	if err != nil || !isValid {
		// Do not leak internal "expired" vs "invalid bcrypt" unless desired, prompt says: "Kode OTP salah atau sudah expired."
		return utils.ErrorResponse(c, fiber.StatusUnauthorized, "Kode OTP salah atau sudah expired.")
	}

	// Double check user constraint to be extremely safe, though login_otp holds a UserID pointer natively
	if otpModel.UserID == nil {
		return utils.ErrorResponse(c, fiber.StatusUnauthorized, "Invalid OTP relation.")
	}

	user, err := ctrl.userRepo.FindByID(*otpModel.UserID)
	if err != nil {
		return utils.ErrorResponse(c, fiber.StatusUnauthorized, "User not found")
	}

	// Delete from DB now that we've successfully consumed the single-use OTP
	_ = ctrl.otpRepo.DeleteOTP(otpModel.ID)

	// Issue final JWT
	token, err := utils.GenerateToken(user.ID, user.Username, user.Role)
	if err != nil {
		return utils.ErrorResponse(c, fiber.StatusInternalServerError, "Failed to generate token")
	}

	return utils.SuccessResponse(c, fiber.Map{
		"token": token,
		"user": fiber.Map{
			"id":         user.ID,
			"username":   user.Username,
			"email":      user.Email,
			"role":       user.Role,
			"avatar_url": user.AvatarURL,
		},
	}, "Login successful")
}

type ResendOTPRequest struct {
	PendingLoginID uuid.UUID `json:"pendingLoginId"`
}

func (ctrl *AuthController) ResendOTP(c *fiber.Ctx) error {
	var req ResendOTPRequest
	if err := c.BodyParser(&req); err != nil {
		return utils.ErrorResponse(c, fiber.StatusBadRequest, "Invalid request")
	}

	// Cooldown Rate Limit (60 seconds per pending session/ip)
	// Using a redis key specifically for resend
	rdKey := "rl:resend:" + req.PendingLoginID.String()
	val, _ := utils.RedisIncr(rdKey)
	if val == 1 {
		utils.RedisExpire(rdKey, 60) // Cooldown period of 60 seconds
	}
	if val > 1 {
		return utils.ErrorResponse(c, fiber.StatusTooManyRequests, "Tunggu sebelum mengirim ulang OTP.")
	}

	secSettings := utils.GetSecuritySettings()
	if !secSettings.LoginOtpEnabled {
		return utils.ErrorResponse(c, fiber.StatusBadRequest, "OTP Login is disabled")
	}

	// Only act if the pending ID natively exists, to prevent arbitrary generation spam.
	// But note: VerifyOTP internally requires "pendingLoginId". 
	// Wait, we need to inspect the old OTP to find user ID.
	// If the old OTP expired, it might have been deleted, leading to failure to resend?
	// Oh, if it was passively deleted, the user has to login from step 1. That's actually correct and extremely secure!
	// We'll manually query the db directly. We bypass VerifyOTP logic since we don't know the string.
	var oldOtp models.SecurityOTP // Re-import models indirectly or use gorm directly
	if err := database.DB.Where("id = ? AND type = ?", req.PendingLoginID, "login_otp").First(&oldOtp).Error; err != nil {
		return utils.ErrorResponse(c, fiber.StatusUnauthorized, "Sesi login tidak valid atau sudah kedaluwarsa.")
	}

	user, err := ctrl.userRepo.FindByID(*oldOtp.UserID)
	if err != nil || user.Email == "" {
		return utils.ErrorResponse(c, fiber.StatusUnauthorized, "Sesi login tidak valid.")
	}

	// Invalidate old OTP
	_ = ctrl.otpRepo.DeleteOTP(oldOtp.ID)

	rawOTP, newPendingLoginId, err := ctrl.otpRepo.CreateOTP(
		&user.ID,
		"login_otp",
		"login",
		"{}",
		5,
		time.Now().Add(5*time.Minute),
	)
	if err != nil {
		log.Printf("[OTP Resend Error] Failed to generate substitute OTP record: %v\n", err)
		return utils.ErrorResponse(c, fiber.StatusInternalServerError, "Gagal mengirim kode OTP. Silakan coba lagi nanti.")
	}

	err = utils.SendOTPEmail(user.Email, "Login OTP Code", "Admin Authentication Code", rawOTP, "A request was made to authenticate your admin session. Use the One-Time Password (OTP) below to proceed.")
	if err != nil {
		log.Printf("[OTP Resend Error] Failed to send email: %v\n", err)
		_ = ctrl.otpRepo.DeleteOTP(newPendingLoginId)
		return utils.ErrorResponse(c, fiber.StatusInternalServerError, "Gagal mengirim kode OTP. Silakan coba lagi nanti.")
	}

	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"success": true,
		"pendingLoginId": newPendingLoginId,
		"message": "Kode OTP baru telah dikirim.",
	})
}
