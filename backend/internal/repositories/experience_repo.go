package repositories

import (
	"github.com/google/uuid"
	"github.com/portfolio/backend/internal/models"
	"gorm.io/gorm"
)

type ExperienceRepo struct {
	DB *gorm.DB
}

func NewExperienceRepo(db *gorm.DB) *ExperienceRepo {
	return &ExperienceRepo{DB: db}
}

func (r *ExperienceRepo) FindAll(search string) ([]models.Experience, error) {
	var exps []models.Experience
	query := r.DB.Model(&models.Experience{})
	if search != "" {
		query = query.Where("company ILIKE ? OR position ILIKE ?", "%"+search+"%", "%"+search+"%")
	}
	err := query.Order("sort_order ASC, start_date DESC").Find(&exps).Error
	return exps, err
}

func (r *ExperienceRepo) FindPublished() ([]models.Experience, error) {
	var exps []models.Experience
	err := r.DB.Where("is_published = ?", true).Order("sort_order ASC, start_date DESC").Find(&exps).Error
	return exps, err
}

func (r *ExperienceRepo) FindByID(id uuid.UUID) (*models.Experience, error) {
	var exp models.Experience
	err := r.DB.First(&exp, id).Error
	return &exp, err
}

func (r *ExperienceRepo) Create(exp *models.Experience) error {
	return r.DB.Create(exp).Error
}

func (r *ExperienceRepo) Update(exp *models.Experience) error {
	return r.DB.Save(exp).Error
}

func (r *ExperienceRepo) Delete(id uuid.UUID) error {
	return r.DB.Delete(&models.Experience{}, id).Error
}
