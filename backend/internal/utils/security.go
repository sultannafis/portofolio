package utils

import (
	"os"
	"strings"

	"github.com/portfolio/backend/internal/database"
	"github.com/portfolio/backend/internal/models"
)

// SecuritySettings contains current evaluated security config
type SecuritySettings struct {
	TurnstileEnabled          bool
	RateLimitEnabled          bool
	VisitorProtectionEnabled  bool
	ResendEmailEnabled        bool
	LoginOtpEnabled           bool
	ExcludeAdminVisitsEnabled bool
}

// GetSecuritySettings returns the current effective security settings.
// It acts as the helper that will eventually combine env values and database settings.
func GetSecuritySettings() SecuritySettings {
	settings := SecuritySettings{
		TurnstileEnabled:          getEnvBool("SECURITY_TURNSTILE_ENABLED", true),
		RateLimitEnabled:          getEnvBool("SECURITY_RATE_LIMIT_ENABLED", true),
		VisitorProtectionEnabled:  getEnvBool("SECURITY_VISITOR_PROTECTION_ENABLED", true),
		ResendEmailEnabled:        getEnvBool("SECURITY_RESEND_EMAIL_ENABLED", true),
		LoginOtpEnabled:           getEnvBool("SECURITY_LOGIN_OTP_ENABLED", false), // Must be false by default
		ExcludeAdminVisitsEnabled: getEnvBool("SECURITY_EXCLUDE_ADMIN_VISITS_ENABLED", true),
	}

	if database.DB != nil {
		var dbSettings []models.Setting
		database.DB.Where("key LIKE ?", "security_%").Find(&dbSettings)

		for _, s := range dbSettings {
			switch s.Key {
			case "security_turnstile_enabled":
				settings.TurnstileEnabled = s.Value == "true"
			case "security_rate_limit_enabled":
				settings.RateLimitEnabled = s.Value == "true"
			case "security_visitor_protection_enabled":
				settings.VisitorProtectionEnabled = s.Value == "true"
			case "security_resend_email_enabled":
				settings.ResendEmailEnabled = s.Value == "true"
			case "security_login_otp_enabled":
				settings.LoginOtpEnabled = s.Value == "true"
			case "security_exclude_admin_visits_enabled":
				settings.ExcludeAdminVisitsEnabled = s.Value == "true"
			}
		}
	}

	return settings
}

func getEnvBool(key string, fallback bool) bool {
	val, exists := os.LookupEnv(key)
	if !exists {
		return fallback
	}
	val = strings.ToLower(strings.TrimSpace(val))
	if val == "false" || val == "0" {
		return false
	}
	if val == "true" || val == "1" {
		return true
	}
	return fallback
}
