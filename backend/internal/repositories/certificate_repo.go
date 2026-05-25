package repositories

import (
	"github.com/google/uuid"
	"github.com/portfolio/backend/internal/models"
	"gorm.io/gorm"
)

type CertificateRepo struct {
	DB *gorm.DB
}

func NewCertificateRepo(db *gorm.DB) *CertificateRepo {
	return &CertificateRepo{DB: db}
}

func (r *CertificateRepo) FindAll(search string) ([]models.Certificate, error) {
	var certs []models.Certificate
	query := r.DB.Model(&models.Certificate{})
	if search != "" {
		query = query.Where("title ILIKE ? OR issuer ILIKE ?", "%"+search+"%", "%"+search+"%")
	}
	err := query.Order("issue_date DESC").Find(&certs).Error
	return certs, err
}

func (r *CertificateRepo) FindPublished() ([]models.Certificate, error) {
	var certs []models.Certificate
	err := r.DB.Where("is_published = ?", true).Order("issue_date DESC").Find(&certs).Error
	return certs, err
}

func (r *CertificateRepo) FindByID(id uuid.UUID) (*models.Certificate, error) {
	var cert models.Certificate
	err := r.DB.First(&cert, id).Error
	return &cert, err
}

func (r *CertificateRepo) Create(cert *models.Certificate) error {
	return r.DB.Create(cert).Error
}

func (r *CertificateRepo) Update(cert *models.Certificate) error {
	return r.DB.Save(cert).Error
}

func (r *CertificateRepo) Delete(id uuid.UUID) error {
	return r.DB.Delete(&models.Certificate{}, id).Error
}
