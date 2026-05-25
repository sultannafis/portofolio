package repositories

import (
	"github.com/google/uuid"
	"github.com/portfolio/backend/internal/models"
	"gorm.io/gorm"
)

type ProjectRepo struct {
	DB *gorm.DB
}

func NewProjectRepo(db *gorm.DB) *ProjectRepo {
	return &ProjectRepo{DB: db}
}

func (r *ProjectRepo) FindAll(page, perPage int, search, category string, published *bool) ([]models.Project, int64, error) {
	var projects []models.Project
	var total int64

	query := r.DB.Model(&models.Project{})

	if search != "" {
		query = query.Where("title ILIKE ? OR description ILIKE ?", "%"+search+"%", "%"+search+"%")
	}
	if category != "" {
		query = query.Where("category = ?", category)
	}
	if published != nil {
		query = query.Where("is_published = ?", *published)
	}

	query.Count(&total)

	offset := (page - 1) * perPage
	err := query.Preload("Media").Order("sort_order ASC, created_at DESC").
		Offset(offset).Limit(perPage).Find(&projects).Error

	return projects, total, err
}

func (r *ProjectRepo) FindBySlug(slug string) (*models.Project, error) {
	var project models.Project
	err := r.DB.Preload("Media").Where("slug = ?", slug).First(&project).Error
	return &project, err
}

func (r *ProjectRepo) FindByID(id uuid.UUID) (*models.Project, error) {
	var project models.Project
	err := r.DB.Preload("Media").First(&project, id).Error
	return &project, err
}

func (r *ProjectRepo) Create(project *models.Project) error {
	return r.DB.Create(project).Error
}

func (r *ProjectRepo) Update(project *models.Project) error {
	return r.DB.Save(project).Error
}

func (r *ProjectRepo) Delete(id uuid.UUID) error {
	return r.DB.Delete(&models.Project{}, id).Error
}

func (r *ProjectRepo) CountAll() (int64, error) {
	var count int64
	err := r.DB.Model(&models.Project{}).Count(&count).Error
	return count, err
}

func (r *ProjectRepo) AddMedia(media *models.ProjectMedia) error {
	return r.DB.Create(media).Error
}

func (r *ProjectRepo) DeleteMedia(id uuid.UUID) error {
	return r.DB.Delete(&models.ProjectMedia{}, id).Error
}

func (r *ProjectRepo) FindMediaByID(id uuid.UUID) (*models.ProjectMedia, error) {
	var media models.ProjectMedia
	err := r.DB.First(&media, id).Error
	return &media, err
}

func (r *ProjectRepo) FindMediaByProjectID(projectID uuid.UUID) ([]models.ProjectMedia, error) {
	var media []models.ProjectMedia
	err := r.DB.Where("project_id = ?", projectID).Order("sort_order ASC").Find(&media).Error
	return media, err
}
