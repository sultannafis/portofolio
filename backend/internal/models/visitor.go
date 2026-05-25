package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type Visitor struct {
	ID        uuid.UUID `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`
	IPAddress string    `gorm:"size:45" json:"ip_address"`
	UserAgent string    `gorm:"type:text" json:"user_agent"`
	Page      string    `gorm:"size:255" json:"page"`
	Country   string    `gorm:"size:100" json:"country"`
	City      string    `gorm:"size:100" json:"city"`
	SessionID string    `gorm:"size:100;index" json:"session_id"`
	CreatedAt time.Time `gorm:"autoCreateTime" json:"created_at"`
}

func (v *Visitor) BeforeCreate(tx *gorm.DB) error {
	if v.ID == uuid.Nil {
		v.ID = uuid.New()
	}
	return nil
}

type Setting struct {
	ID        uuid.UUID `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`
	Key       string    `gorm:"uniqueIndex;size:100;not null" json:"key"`
	Value     string    `gorm:"type:text" json:"value"`
	UpdatedAt time.Time `gorm:"autoUpdateTime" json:"updated_at"`
}

func (s *Setting) BeforeCreate(tx *gorm.DB) error {
	if s.ID == uuid.Nil {
		s.ID = uuid.New()
	}
	return nil
}

type Translation struct {
	ID        uuid.UUID `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`
	Lang      string    `gorm:"size:10;not null;uniqueIndex:idx_lang_key" json:"lang"`
	Key       string    `gorm:"size:255;not null;uniqueIndex:idx_lang_key" json:"key"`
	Value     string    `gorm:"type:text;not null" json:"value"`
	CreatedAt time.Time `gorm:"autoCreateTime" json:"created_at"`
}

func (t *Translation) BeforeCreate(tx *gorm.DB) error {
	if t.ID == uuid.Nil {
		t.ID = uuid.New()
	}
	return nil
}
