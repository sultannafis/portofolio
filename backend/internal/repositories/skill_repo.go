package repositories

import (
	"github.com/google/uuid"
	"github.com/portfolio/backend/internal/models"
	"gorm.io/gorm"
)

type SkillRepo struct {
	DB *gorm.DB
}

func NewSkillRepo(db *gorm.DB) *SkillRepo {
	return &SkillRepo{DB: db}
}

func (r *SkillRepo) FindAll(search, category string) ([]models.Skill, error) {
	var skills []models.Skill
	query := r.DB.Model(&models.Skill{})
	if search != "" {
		query = query.Where("name ILIKE ?", "%"+search+"%")
	}
	if category != "" {
		query = query.Where("category = ?", category)
	}
	err := query.Order("sort_order ASC, name ASC").Find(&skills).Error
	return skills, err
}

func (r *SkillRepo) FindPublished() ([]models.Skill, error) {
	var skills []models.Skill
	err := r.DB.Where("is_published = ?", true).Order("sort_order ASC").Find(&skills).Error
	return skills, err
}

func (r *SkillRepo) FindByID(id uuid.UUID) (*models.Skill, error) {
	var skill models.Skill
	err := r.DB.First(&skill, id).Error
	return &skill, err
}

func (r *SkillRepo) Create(skill *models.Skill) error {
	return r.DB.Create(skill).Error
}

func (r *SkillRepo) Update(skill *models.Skill) error {
	return r.DB.Save(skill).Error
}

func (r *SkillRepo) Delete(id uuid.UUID) error {
	return r.DB.Delete(&models.Skill{}, id).Error
}
