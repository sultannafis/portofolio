package repositories

import (
	"time"

	"github.com/portfolio/backend/internal/models"
	"gorm.io/gorm"
)

type VisitorRepo struct {
	DB *gorm.DB
}

func NewVisitorRepo(db *gorm.DB) *VisitorRepo {
	return &VisitorRepo{DB: db}
}

func (r *VisitorRepo) Create(visitor *models.Visitor) error {
	return r.DB.Create(visitor).Error
}

func (r *VisitorRepo) CountToday() (int64, error) {
	var count int64
	today := time.Now().Truncate(24 * time.Hour)
	err := r.DB.Model(&models.Visitor{}).Where("created_at >= ?", today).Count(&count).Error
	return count, err
}

func (r *VisitorRepo) CountTotal() (int64, error) {
	var count int64
	err := r.DB.Model(&models.Visitor{}).Count(&count).Error
	return count, err
}

func (r *VisitorRepo) CountByPage() ([]map[string]interface{}, error) {
	var results []map[string]interface{}
	err := r.DB.Model(&models.Visitor{}).
		Select("page, COUNT(*) as count").
		Group("page").
		Order("count DESC").
		Find(&results).Error
	return results, err
}

func (r *VisitorRepo) GetDailyStats(days int) ([]map[string]interface{}, error) {
	var results []map[string]interface{}
	since := time.Now().AddDate(0, 0, -days)
	err := r.DB.Model(&models.Visitor{}).
		Select("DATE(created_at) as date, COUNT(*) as count").
		Where("created_at >= ?", since).
		Group("DATE(created_at)").
		Order("date ASC").
		Find(&results).Error
	return results, err
}

type SettingRepo struct {
	DB *gorm.DB
}

func NewSettingRepo(db *gorm.DB) *SettingRepo {
	return &SettingRepo{DB: db}
}

func (r *SettingRepo) FindAll() ([]models.Setting, error) {
	var settings []models.Setting
	err := r.DB.Find(&settings).Error
	return settings, err
}

func (r *SettingRepo) FindByKey(key string) (*models.Setting, error) {
	var setting models.Setting
	err := r.DB.Where("key = ?", key).First(&setting).Error
	return &setting, err
}

func (r *SettingRepo) Upsert(key, value string) error {
	var setting models.Setting
	result := r.DB.Where("key = ?", key).First(&setting)
	if result.Error == gorm.ErrRecordNotFound {
		setting = models.Setting{Key: key, Value: value}
		return r.DB.Create(&setting).Error
	}
	setting.Value = value
	return r.DB.Save(&setting).Error
}

type TranslationRepo struct {
	DB *gorm.DB
}

func NewTranslationRepo(db *gorm.DB) *TranslationRepo {
	return &TranslationRepo{DB: db}
}

func (r *TranslationRepo) FindByLang(lang string) ([]models.Translation, error) {
	var translations []models.Translation
	err := r.DB.Where("lang = ?", lang).Find(&translations).Error
	return translations, err
}

func (r *TranslationRepo) Upsert(lang, key, value string) error {
	var trans models.Translation
	result := r.DB.Where("lang = ? AND key = ?", lang, key).First(&trans)
	if result.Error == gorm.ErrRecordNotFound {
		trans = models.Translation{Lang: lang, Key: key, Value: value}
		return r.DB.Create(&trans).Error
	}
	trans.Value = value
	return r.DB.Save(&trans).Error
}
