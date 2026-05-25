package repositories

import (
	"github.com/google/uuid"
	"github.com/portfolio/backend/internal/models"
	"gorm.io/gorm"
)

type UserRepo struct {
	DB *gorm.DB
}

func NewUserRepo(db *gorm.DB) *UserRepo {
	return &UserRepo{DB: db}
}

func (r *UserRepo) FindByUsername(username string) (*models.User, error) {
	var user models.User
	err := r.DB.Where("username = ?", username).First(&user).Error
	return &user, err
}

func (r *UserRepo) FindByID(id uuid.UUID) (*models.User, error) {
	var user models.User
	err := r.DB.First(&user, id).Error
	return &user, err
}

func (r *UserRepo) Create(user *models.User) error {
	return r.DB.Create(user).Error
}

func (r *UserRepo) Update(user *models.User) error {
	return r.DB.Save(user).Error
}

func (r *UserRepo) CountAll() (int64, error) {
	var count int64
	err := r.DB.Model(&models.User{}).Count(&count).Error
	return count, err
}
