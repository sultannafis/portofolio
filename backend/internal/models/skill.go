package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type Skill struct {
	ID          uuid.UUID `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`
	Name        string    `gorm:"size:100;not null" json:"name"`
	Icon        string    `gorm:"size:50" json:"icon"`
	Proficiency int       `gorm:"default:0" json:"proficiency"`
	SortOrder   int       `gorm:"default:0" json:"sort_order"`
	IsPublished bool      `gorm:"default:true" json:"is_published"`
	CreatedAt   time.Time `gorm:"autoCreateTime" json:"created_at"`
}

func (s *Skill) BeforeCreate(tx *gorm.DB) error {
	if s.ID == uuid.Nil {
		s.ID = uuid.New()
	}
	return nil
}
