package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type Experience struct {
	ID               uuid.UUID  `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`
	Company          string     `gorm:"size:200;not null" json:"company"`
	Position         string     `gorm:"size:200;not null" json:"position"`
	Description      string     `gorm:"type:text" json:"description"`
	StartDate        *time.Time `json:"start_date"`
	EndDate          *time.Time `json:"end_date"`
	IsCurrent        bool       `gorm:"default:false" json:"is_current"`
	CompanyLogoURL   string     `gorm:"type:text" json:"company_logo_url"`
	CompanyLogoPublicID string  `gorm:"size:255" json:"company_logo_public_id"`
	SortOrder        int        `gorm:"default:0" json:"sort_order"`
	IsPublished      bool       `gorm:"default:true" json:"is_published"`
	CreatedAt        time.Time  `gorm:"autoCreateTime" json:"created_at"`
}

func (e *Experience) BeforeCreate(tx *gorm.DB) error {
	if e.ID == uuid.Nil {
		e.ID = uuid.New()
	}
	return nil
}
