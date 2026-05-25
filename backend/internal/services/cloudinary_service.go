package services

import (
	"context"
	"fmt"
	"mime/multipart"
	"strings"

	"github.com/cloudinary/cloudinary-go/v2"
	"github.com/cloudinary/cloudinary-go/v2/api/uploader"
	"github.com/portfolio/backend/internal/config"
)

type CloudinaryService struct {
	cld *cloudinary.Cloudinary
}

type UploadResult struct {
	URL      string `json:"url"`
	PublicID string `json:"public_id"`
}

func NewCloudinaryService() *CloudinaryService {
	cld, err := cloudinary.NewFromURL(config.AppConfig.CloudinaryURL)
	if err != nil {
		panic(fmt.Sprintf("Failed to init Cloudinary: %v", err))
	}
	return &CloudinaryService{cld: cld}
}

func (s *CloudinaryService) Upload(file multipart.File, folder string, resourceType string) (*UploadResult, error) {
	ctx := context.Background()

	uploadParams := uploader.UploadParams{
		Folder:       "portfolio/" + folder,
		ResourceType: resourceType,
	}

	if resourceType == "" || resourceType == "image" {
		uploadParams.ResourceType = "image"
		uploadParams.Transformation = "q_auto,f_auto"
	}

	result, err := s.cld.Upload.Upload(ctx, file, uploadParams)
	if err != nil {
		return nil, fmt.Errorf("cloudinary upload error: %w", err)
	}

	return &UploadResult{
		URL:      result.SecureURL,
		PublicID: result.PublicID,
	}, nil
}

func (s *CloudinaryService) Delete(publicID string) error {
	ctx := context.Background()

	resourceType := "image"
	if strings.Contains(publicID, "video") {
		resourceType = "video"
	}

	_, err := s.cld.Upload.Destroy(ctx, uploader.DestroyParams{
		PublicID:     publicID,
		ResourceType: resourceType,
	})
	if err != nil {
		return fmt.Errorf("cloudinary delete error: %w", err)
	}

	return nil
}

func (s *CloudinaryService) Replace(file multipart.File, oldPublicID string, folder string, resourceType string) (*UploadResult, error) {
	// Upload new file first
	result, err := s.Upload(file, folder, resourceType)
	if err != nil {
		return nil, err
	}

	// Delete old file
	if oldPublicID != "" {
		_ = s.Delete(oldPublicID)
	}

	return result, nil
}
