package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type Project struct {
	ID                 uuid.UUID      `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id" form:"id"`
	Title              string         `gorm:"size:200;not null" json:"title" form:"title"`
	Slug               string         `gorm:"uniqueIndex;size:200;not null" json:"slug" form:"slug"`
	Description        string         `gorm:"type:text" json:"description" form:"description"`
	ThumbnailURL       string         `gorm:"type:text" json:"thumbnail_url" form:"thumbnail_url"`
	ThumbnailPublicID  string         `gorm:"size:255" json:"thumbnail_public_id" form:"thumbnail_public_id"`
	GithubURL          string         `gorm:"type:text" json:"github_url" form:"github_url"`
	DemoURL            string         `gorm:"type:text" json:"demo_url" form:"demo_url"`
	VideoURL           string         `gorm:"type:text" json:"video_url" form:"video_url"`
	DocumentationURL   string         `gorm:"type:text" json:"documentation_url" form:"documentation_url"`
	Category           string         `gorm:"size:100" json:"category" form:"category"`
	Tags               string         `gorm:"type:text" json:"tags" form:"tags"`
	Year               int            `json:"year" form:"year"`
	IsPublished        bool           `gorm:"default:false" json:"is_published" form:"is_published"`
	SortOrder          int            `gorm:"default:0" json:"sort_order" form:"sort_order"`
	Media              []ProjectMedia `gorm:"foreignKey:ProjectID;constraint:OnDelete:CASCADE" json:"media"`
	CreatedAt          time.Time      `gorm:"autoCreateTime" json:"created_at"`
	UpdatedAt          time.Time      `gorm:"autoUpdateTime" json:"updated_at"`
}

func (p *Project) BeforeCreate(tx *gorm.DB) error {
	if p.ID == uuid.Nil {
		p.ID = uuid.New()
	}
	return nil
}

type ProjectMedia struct {
	ID        uuid.UUID `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`
	ProjectID uuid.UUID `gorm:"type:uuid;not null;index" json:"project_id"`
	MediaURL  string    `gorm:"type:text;not null" json:"media_url"`
	PublicID  string    `gorm:"size:255;not null" json:"public_id"`
	MediaType string    `gorm:"size:20;not null" json:"media_type"`
	SortOrder int       `gorm:"default:0" json:"sort_order"`
	CreatedAt time.Time `gorm:"autoCreateTime" json:"created_at"`
}

func (pm *ProjectMedia) BeforeCreate(tx *gorm.DB) error {
	if pm.ID == uuid.Nil {
		pm.ID = uuid.New()
	}
	return nil
}
