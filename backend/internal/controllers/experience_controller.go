package controllers

import (
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/portfolio/backend/internal/database"
	"github.com/portfolio/backend/internal/models"
	"github.com/portfolio/backend/internal/repositories"
	"github.com/portfolio/backend/internal/services"
	"github.com/portfolio/backend/internal/utils"
	ws "github.com/portfolio/backend/internal/websocket"
	"time"
)

type ExperienceController struct {
	expRepo    *repositories.ExperienceRepo
	cloudinary *services.CloudinaryService
}

func NewExperienceController(cld *services.CloudinaryService) *ExperienceController {
	return &ExperienceController{
		expRepo:    repositories.NewExperienceRepo(database.DB),
		cloudinary: cld,
	}
}

func (ctrl *ExperienceController) GetAll(c *fiber.Ctx) error {
	search := c.Query("search", "")
	exps, err := ctrl.expRepo.FindAll(search)
	if err != nil {
		return utils.ErrorResponse(c, fiber.StatusInternalServerError, "Failed to fetch experiences")
	}
	return utils.SuccessResponse(c, exps, "Experiences fetched")
}

func (ctrl *ExperienceController) GetPublished(c *fiber.Ctx) error {
	exps, err := ctrl.expRepo.FindPublished()
	if err != nil {
		return utils.ErrorResponse(c, fiber.StatusInternalServerError, "Failed to fetch experiences")
	}
	return utils.SuccessResponse(c, exps, "Experiences fetched")
}

func (ctrl *ExperienceController) GetById(c *fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return utils.ErrorResponse(c, fiber.StatusBadRequest, "Invalid ID")
	}
	exp, err := ctrl.expRepo.FindByID(id)
	if err != nil {
		return utils.ErrorResponse(c, fiber.StatusNotFound, "Experience not found")
	}
	return utils.SuccessResponse(c, exp, "Experience fetched")
}

func (ctrl *ExperienceController) Create(c *fiber.Ctx) error {
	var exp models.Experience
	if err := c.BodyParser(&exp); err != nil {
		return utils.ErrorResponse(c, fiber.StatusBadRequest, "Invalid request body")
	}
	if exp.Company == "" || exp.Position == "" {
		return utils.ErrorResponse(c, fiber.StatusBadRequest, "Company and position are required")
	}

	file, err := c.FormFile("logo")
	if err == nil {
		f, _ := file.Open()
		defer f.Close()
		result, err := ctrl.cloudinary.Upload(f, "experiences", "image")
		if err == nil {
			exp.CompanyLogoURL = result.URL
			exp.CompanyLogoPublicID = result.PublicID
		}
	}

	exp.IsCurrent = c.FormValue("is_current") == "true"
	exp.IsPublished = c.FormValue("is_published") == "true"
	
	if start := c.FormValue("start_date"); start != "" {
		if t, err := time.Parse("2006-01-02", start); err == nil {
			exp.StartDate = &t
		}
	}
	if end := c.FormValue("end_date"); end != "" {
		if t, err := time.Parse("2006-01-02", end); err == nil {
			exp.EndDate = &t
		}
	}

	if err := ctrl.expRepo.Create(&exp); err != nil {
		return utils.ErrorResponse(c, fiber.StatusInternalServerError, "Failed to create experience")
	}
	if ws.HubInstance != nil {
		ws.HubInstance.BroadcastMessage("data:update", map[string]string{"entity": "experiences", "action": "create"})
	}
	return utils.SuccessResponse(c, exp, "Experience created")
}

func (ctrl *ExperienceController) Update(c *fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return utils.ErrorResponse(c, fiber.StatusBadRequest, "Invalid ID")
	}
	existing, err := ctrl.expRepo.FindByID(id)
	if err != nil {
		return utils.ErrorResponse(c, fiber.StatusNotFound, "Experience not found")
	}
	if err := c.BodyParser(existing); err != nil {
		return utils.ErrorResponse(c, fiber.StatusBadRequest, "Invalid request body")
	}

	file, err := c.FormFile("logo")
	if err == nil {
		f, _ := file.Open()
		defer f.Close()
		result, err := ctrl.cloudinary.Replace(f, existing.CompanyLogoPublicID, "experiences", "image")
		if err == nil {
			existing.CompanyLogoURL = result.URL
			existing.CompanyLogoPublicID = result.PublicID
		}
	}

	existing.IsCurrent = c.FormValue("is_current") == "true"
	existing.IsPublished = c.FormValue("is_published") == "true"
	
	if start := c.FormValue("start_date"); start != "" {
		if t, err := time.Parse("2006-01-02", start); err == nil {
			existing.StartDate = &t
		}
	} else {
		existing.StartDate = nil
	}
	
	if end := c.FormValue("end_date"); end != "" {
		if t, err := time.Parse("2006-01-02", end); err == nil {
			existing.EndDate = &t
		}
	} else {
		existing.EndDate = nil
	}

	if err := ctrl.expRepo.Update(existing); err != nil {
		return utils.ErrorResponse(c, fiber.StatusInternalServerError, "Failed to update experience")
	}
	if ws.HubInstance != nil {
		ws.HubInstance.BroadcastMessage("data:update", map[string]string{"entity": "experiences", "action": "update"})
	}
	return utils.SuccessResponse(c, existing, "Experience updated")
}

func (ctrl *ExperienceController) Delete(c *fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return utils.ErrorResponse(c, fiber.StatusBadRequest, "Invalid ID")
	}
	exp, err := ctrl.expRepo.FindByID(id)
	if err != nil {
		return utils.ErrorResponse(c, fiber.StatusNotFound, "Experience not found")
	}
	if exp.CompanyLogoPublicID != "" {
		_ = ctrl.cloudinary.Delete(exp.CompanyLogoPublicID)
	}
	if err := ctrl.expRepo.Delete(id); err != nil {
		return utils.ErrorResponse(c, fiber.StatusInternalServerError, "Failed to delete experience")
	}
	if ws.HubInstance != nil {
		ws.HubInstance.BroadcastMessage("data:update", map[string]string{"entity": "experiences", "action": "delete"})
	}
	return utils.SuccessResponse(c, nil, "Experience deleted")
}
