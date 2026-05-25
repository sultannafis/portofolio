package repositories

import (
	"github.com/google/uuid"
	"github.com/portfolio/backend/internal/models"
	"gorm.io/gorm"
)

type MessageRepo struct {
	DB *gorm.DB
}

func NewMessageRepo(db *gorm.DB) *MessageRepo {
	return &MessageRepo{DB: db}
}

func (r *MessageRepo) FindAll(page, perPage int, isRead *bool) ([]models.Message, int64, error) {
	var messages []models.Message
	var total int64

	query := r.DB.Model(&models.Message{})
	if isRead != nil {
		query = query.Where("is_read = ?", *isRead)
	}

	query.Count(&total)

	offset := (page - 1) * perPage
	err := query.Order("created_at DESC").Offset(offset).Limit(perPage).Find(&messages).Error
	return messages, total, err
}

func (r *MessageRepo) FindByID(id uuid.UUID) (*models.Message, error) {
	var msg models.Message
	err := r.DB.First(&msg, id).Error
	return &msg, err
}

func (r *MessageRepo) Create(msg *models.Message) error {
	return r.DB.Create(msg).Error
}

func (r *MessageRepo) MarkAsRead(id uuid.UUID) error {
	return r.DB.Model(&models.Message{}).Where("id = ?", id).Update("is_read", true).Error
}

func (r *MessageRepo) Delete(id uuid.UUID) error {
	return r.DB.Delete(&models.Message{}, id).Error
}

func (r *MessageRepo) CountUnread() (int64, error) {
	var count int64
	err := r.DB.Model(&models.Message{}).Where("is_read = ?", false).Count(&count).Error
	return count, err
}
