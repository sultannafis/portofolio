package database

import (
	"fmt"
	"log"

	"github.com/portfolio/backend/internal/models"
)

func Migrate() {
	err := DB.AutoMigrate(
		&models.User{},
		&models.Project{},
		&models.ProjectMedia{},
		&models.Skill{},
		&models.Certificate{},
		&models.Experience{},
		&models.Message{},
		&models.Visitor{},
		&models.Setting{},
		&models.Translation{},
	)
	if err != nil {
		log.Fatal("Failed to migrate database:", err)
	}
	fmt.Println("✅ Database migrated successfully")
}
