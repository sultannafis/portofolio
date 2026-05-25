package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type Certificate struct {
	ID            uuid.UUID  `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id" form:"id"`
	Title         string     `gorm:"size:200;not null" json:"title" form:"title"`
	Issuer        string     `gorm:"size:200" json:"issuer" form:"issuer"`
	IssueDate     *time.Time `json:"issue_date" form:"-"`
	ExpiryDate    *time.Time `json:"expiry_date" form:"-"`
	CredentialURL string     `gorm:"type:text" json:"credential_url" form:"credential_url"`
	ImageURL      string     `gorm:"type:text" json:"image_url" form:"image_url"`
	ImagePublicID string     `gorm:"size:255" json:"image_public_id" form:"image_public_id"`
	IsPublished   bool       `gorm:"default:true" json:"is_published" form:"is_published"`
	CreatedAt     time.Time  `gorm:"autoCreateTime" json:"created_at" form:"created_at"`
}

func (c *Certificate) BeforeCreate(tx *gorm.DB) error {
	if c.ID == uuid.Nil {
		c.ID = uuid.New()
	}
	return nil
}
