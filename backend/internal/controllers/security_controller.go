package controllers

import (
	"encoding/json"
	"log"
	"os"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/portfolio/backend/internal/database"
	"github.com/portfolio/backend/internal/models"
	"github.com/portfolio/backend/internal/repositories"
	"github.com/portfolio/backend/internal/utils"
)

type SecurityController struct {
	settingRepo *repositories.SettingRepo
	otpRepo     *repositories.SecurityOTPRepo
	userRepo    *repositories.UserRepo
}

func NewSecurityController() *SecurityController {
	return &SecurityController{
		settingRepo: repositories.NewSettingRepo(database.DB),
		otpRepo:     repositories.NewSecurityOTPRepo(database.DB),
		userRepo:    repositories.NewUserRepo(database.DB),
	}
}

type PublicSecuritySettingsResponse struct {
	TurnstileEnabled bool `json:"turnstileEnabled"`
}

func (ctrl *SecurityController) GetPublicSecuritySettings(c *fiber.Ctx) error {
	settings := utils.GetSecuritySettings()
	return c.JSON(PublicSecuritySettingsResponse{
		TurnstileEnabled: settings.TurnstileEnabled,
	})
}

func (ctrl *SecurityController) GetAdminSecuritySettings(c *fiber.Ctx) error {
	settings := utils.GetSecuritySettings()
	return utils.SuccessResponse(c, fiber.Map{
		"security_turnstile_enabled":            settings.TurnstileEnabled,
		"security_rate_limit_enabled":           settings.RateLimitEnabled,
		"security_visitor_protection_enabled":   settings.VisitorProtectionEnabled,
		"security_resend_email_enabled":         settings.ResendEmailEnabled,
		"security_login_otp_enabled":            settings.LoginOtpEnabled,
		"security_exclude_admin_visits_enabled": settings.ExcludeAdminVisitsEnabled,
	}, "Security settings retrieved")
}

type UpdateSecuritySettingRequest struct {
	SettingKey string `json:"settingKey"`
	NewValue   bool   `json:"newValue"`
}

func (ctrl *SecurityController) UpdateSecuritySetting(c *fiber.Ctx) error {
	var req UpdateSecuritySettingRequest
	if err := c.BodyParser(&req); err != nil {
		return utils.ErrorResponse(c, fiber.StatusBadRequest, "Invalid request body")
	}

	if !isSettingAllowed(req.SettingKey) {
		return utils.ErrorResponse(c, fiber.StatusBadRequest, "Invalid setting key")
	}

	if isProtectedSetting(req.SettingKey) {
		return utils.ErrorResponse(c, fiber.StatusForbidden, "This setting requires OTP confirmation")
	}

	// Update immediately for non-protected settings
	valStr := "false"
	if req.NewValue {
		valStr = "true"
	}
	if err := ctrl.settingRepo.Upsert(req.SettingKey, valStr); err != nil {
		return utils.ErrorResponse(c, fiber.StatusInternalServerError, "Failed to update setting")
	}

	return utils.SuccessResponse(c, nil, "Pengaturan berhasil diperbarui.")
}

func (ctrl *SecurityController) RequestOTP(c *fiber.Ctx) error {
	var req UpdateSecuritySettingRequest
	if err := c.BodyParser(&req); err != nil {
		return utils.ErrorResponse(c, fiber.StatusBadRequest, "Invalid request body")
	}

	if !isSettingAllowed(req.SettingKey) || !isProtectedSetting(req.SettingKey) {
		return utils.ErrorResponse(c, fiber.StatusBadRequest, "Invalid or unprotected setting key")
	}

	// Rate Limit Request OTP
	userID := c.Locals("userID").(uuid.UUID)
	rdKey := "rl:sec_otp:" + userID.String()
	val, _ := utils.RedisIncr(rdKey)
	if val == 1 {
		utils.RedisExpire(rdKey, 60) // 60 seconds cooldown
	}
	if val > 1 {
		return utils.ErrorResponse(c, fiber.StatusTooManyRequests, "Tunggu sebelum mengirim ulang OTP.")
	}

	// Safety Checks
	if req.NewValue {
		if req.SettingKey == "security_login_otp_enabled" {
			if os.Getenv("RESEND_API_KEY") == "" || os.Getenv("CONTACT_FROM_EMAIL") == "" {
				return utils.ErrorResponse(c, fiber.StatusBadRequest, "Missing required server configuration (Resend).")
			}
		} else if req.SettingKey == "security_turnstile_enabled" {
			if os.Getenv("TURNSTILE_SECRET_KEY") == "" {
				return utils.ErrorResponse(c, fiber.StatusBadRequest, "Missing required server configuration (Turnstile).")
			}
		} else if req.SettingKey == "security_rate_limit_enabled" {
			if os.Getenv("UPSTASH_REDIS_REST_URL") == "" || os.Getenv("UPSTASH_REDIS_REST_TOKEN") == "" {
				return utils.ErrorResponse(c, fiber.StatusBadRequest, "Missing required server configuration (Redis).")
			}
		} else if req.SettingKey == "security_visitor_protection_enabled" {
			if os.Getenv("VISITOR_HASH_SECRET") == "" {
				return utils.ErrorResponse(c, fiber.StatusBadRequest, "Missing required server configuration (Visitor Secret).")
			}
		}
	}

	user, err := ctrl.userRepo.FindByID(userID)
	if err != nil || user.Email == "" {
		return utils.ErrorResponse(c, fiber.StatusBadRequest, "Admin email not configured.")
	}

	_ = ctrl.otpRepo.CleanupExpiredOTPs()

	payloadData := map[string]interface{}{
		"settingKey": req.SettingKey,
		"newValue":   req.NewValue,
	}

	payloadJson, _ := json.Marshal(payloadData)

	rawOTP, _, err := ctrl.otpRepo.CreateOTP(
		&user.ID,
		"security_setting_change",
		"update_setting",
		string(payloadJson),
		5,
		time.Now().Add(5*time.Minute),
	)
	if err != nil {
		log.Printf("[OTP Error] %v\n", err)
		return utils.ErrorResponse(c, fiber.StatusInternalServerError, "Gagal mengirim kode OTP.")
	}

	if err := utils.SendOTPEmail(user.Email, "Security Settings OTP Code", "Admin Authentication Code", rawOTP, "A request was made to change your security settings. Use the One-Time Password (OTP) below to proceed."); err != nil {
		log.Printf("[Resend Error] %v\n", err)
		return utils.ErrorResponse(c, fiber.StatusInternalServerError, "Gagal mengirim kode OTP.")
	}

	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"message":     "Kode OTP telah dikirim ke email admin.",
		"maskedEmail": utils.MaskEmail(user.Email),
	})
}

type VerifySecurityOTPRequest struct {
	SettingKey string `json:"settingKey"`
	NewValue   bool   `json:"newValue"`
	OTP        string `json:"otp"`
}

func (ctrl *SecurityController) VerifyOTP(c *fiber.Ctx) error {
	var req VerifySecurityOTPRequest
	if err := c.BodyParser(&req); err != nil {
		return utils.ErrorResponse(c, fiber.StatusBadRequest, "Invalid request body")
	}

	userID := c.Locals("userID").(uuid.UUID)

	// Since we don't have PendingLoginID in frontend request as per contract, we verify by taking the latest OTP for this user
	var otpModel models.SecurityOTP
	if err := database.DB.Where("user_id = ? AND type = ?", userID, "security_setting_change").Order("created_at desc").First(&otpModel).Error; err != nil {
		return utils.ErrorResponse(c, fiber.StatusUnauthorized, "OTP request not found or expired")
	}

	isValid, verifiedOtp, err := ctrl.otpRepo.VerifyOTP(otpModel.ID, req.OTP, "security_setting_change")
	if err != nil || !isValid {
		return utils.ErrorResponse(c, fiber.StatusUnauthorized, "Invalid or expired OTP")
	}

	// Verify payload matches
	type PayloadType struct {
		SettingKey string `json:"settingKey"`
		NewValue   bool   `json:"newValue"`
	}
	var payload PayloadType
	json.Unmarshal([]byte(verifiedOtp.PendingPayload), &payload)

	if payload.SettingKey != req.SettingKey || payload.NewValue != req.NewValue {
		return utils.ErrorResponse(c, fiber.StatusUnauthorized, "OTP Payload mismatch")
	}

	valStr := "false"
	if req.NewValue {
		valStr = "true"
	}
	
	if err := ctrl.settingRepo.Upsert(req.SettingKey, valStr); err != nil {
		return utils.ErrorResponse(c, fiber.StatusInternalServerError, "Failed to update setting")
	}

	_ = ctrl.otpRepo.DeleteOTP(verifiedOtp.ID)

	return utils.SuccessResponse(c, nil, "Pengaturan berhasil diperbarui.")
}

func isSettingAllowed(key string) bool {
	allowed := map[string]bool{
		"security_turnstile_enabled":            true,
		"security_rate_limit_enabled":           true,
		"security_visitor_protection_enabled":   true,
		"security_resend_email_enabled":         true,
		"security_exclude_admin_visits_enabled": true,
		"security_login_otp_enabled":            true,
	}
	return allowed[key]
}

func isProtectedSetting(key string) bool {
	protected := map[string]bool{
		"security_turnstile_enabled":          true,
		"security_rate_limit_enabled":         true,
		"security_visitor_protection_enabled": true,
		"security_login_otp_enabled":          true,
	}
	return protected[key]
}
