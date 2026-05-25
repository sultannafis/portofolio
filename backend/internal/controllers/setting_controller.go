package controllers

import (
	"github.com/gofiber/fiber/v2"
	"github.com/portfolio/backend/internal/database"
	"github.com/portfolio/backend/internal/repositories"
	"github.com/portfolio/backend/internal/services"
	"github.com/portfolio/backend/internal/utils"
)

type SettingController struct {
	settingRepo *repositories.SettingRepo
	cloudinary  *services.CloudinaryService
}

func NewSettingController(cld *services.CloudinaryService) *SettingController {
	return &SettingController{
		settingRepo: repositories.NewSettingRepo(database.DB),
		cloudinary:  cld,
	}
}

func (ctrl *SettingController) GetAll(c *fiber.Ctx) error {
	settings, err := ctrl.settingRepo.FindAll()
	if err != nil {
		return utils.ErrorResponse(c, fiber.StatusInternalServerError, "Failed to fetch settings")
	}

	result := make(map[string]string)
	for _, s := range settings {
		result[s.Key] = s.Value
	}

	return utils.SuccessResponse(c, result, "Settings fetched")
}

func (ctrl *SettingController) Update(c *fiber.Ctx) error {
	var body map[string]string
	if err := c.BodyParser(&body); err != nil {
		return utils.ErrorResponse(c, fiber.StatusBadRequest, "Invalid request body")
	}
	for key, value := range body {
		ctrl.settingRepo.Upsert(key, value)
	}
	return utils.SuccessResponse(c, nil, "Settings updated")
}

func (ctrl *SettingController) UploadProfileImage(c *fiber.Ctx) error {
	file, err := c.FormFile("image")
	if err != nil {
		return utils.ErrorResponse(c, fiber.StatusBadRequest, "Image file is required")
	}

	f, _ := file.Open()
	defer f.Close()
	result, err := ctrl.cloudinary.Upload(f, "profile", "auto")
	if err != nil {
		return utils.ErrorResponse(c, fiber.StatusInternalServerError, "Failed to upload file to Cloudinary")
	}

	// Try to get previous image and delete it if exists
	settings, _ := ctrl.settingRepo.FindAll()
	var oldPublicID string
	for _, s := range settings {
		if s.Key == "profile_image_public_id" {
			oldPublicID = s.Value
			break
		}
	}

	if oldPublicID != "" {
		_ = ctrl.cloudinary.Delete(oldPublicID)
	}

	// Save new URL and Public ID
	ctrl.settingRepo.Upsert("profile_image_url", result.URL)
	ctrl.settingRepo.Upsert("profile_image_public_id", result.PublicID)

	return utils.SuccessResponse(c, fiber.Map{
		"url":       result.URL,
		"public_id": result.PublicID,
	}, "Profile image uploaded successfully")
}
