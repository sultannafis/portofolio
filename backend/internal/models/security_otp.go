package models

import (
	"time"

	"github.com/google/uuid"
)

type SecurityOTP struct {
	ID             uuid.UUID  `gorm:"type:uuid;default:gen_random_uuid();primaryKey" json:"id"`
	UserID         *uuid.UUID `gorm:"type:uuid;index;column:user_id" json:"user_id"`
	OTPHash        string     `gorm:"not null" json:"-"`
	Type           string     `gorm:"not null;index" json:"type"` // e.g. "login_otp" or "security_setting_change"
	PendingAction  string     `json:"pending_action"`
	PendingPayload string     `gorm:"type:jsonb" json:"pending_payload"`
	ExpiresAt      time.Time  `gorm:"not null;index" json:"expires_at"`
	Attempts       int        `gorm:"default:0" json:"attempts"`
	MaxAttempts    int        `gorm:"default:5" json:"max_attempts"`
	CreatedAt      time.Time  `json:"created_at"`
	UpdatedAt      time.Time  `json:"updated_at"`
}
