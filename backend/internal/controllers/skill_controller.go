package controllers

import (
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/portfolio/backend/internal/database"
	"github.com/portfolio/backend/internal/models"
	"github.com/portfolio/backend/internal/repositories"
	"github.com/portfolio/backend/internal/utils"
	ws "github.com/portfolio/backend/internal/websocket"
)

type SkillController struct {
	skillRepo *repositories.SkillRepo
}

func NewSkillController() *SkillController {
	return &SkillController{
		skillRepo: repositories.NewSkillRepo(database.DB),
	}
}

func (ctrl *SkillController) GetAll(c *fiber.Ctx) error {
	search := c.Query("search", "")
	category := c.Query("category", "")
	skills, err := ctrl.skillRepo.FindAll(search, category)
	if err != nil {
		return utils.ErrorResponse(c, fiber.StatusInternalServerError, "Failed to fetch skills")
	}
	return utils.SuccessResponse(c, skills, "Skills fetched")
}

func (ctrl *SkillController) GetPublished(c *fiber.Ctx) error {
	skills, err := ctrl.skillRepo.FindPublished()
	if err != nil {
		return utils.ErrorResponse(c, fiber.StatusInternalServerError, "Failed to fetch skills")
	}
	return utils.SuccessResponse(c, skills, "Skills fetched")
}

func (ctrl *SkillController) GetById(c *fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return utils.ErrorResponse(c, fiber.StatusBadRequest, "Invalid ID")
	}
	skill, err := ctrl.skillRepo.FindByID(id)
	if err != nil {
		return utils.ErrorResponse(c, fiber.StatusNotFound, "Skill not found")
	}
	return utils.SuccessResponse(c, skill, "Skill fetched")
}

func (ctrl *SkillController) Create(c *fiber.Ctx) error {
	var skill models.Skill
	if err := c.BodyParser(&skill); err != nil {
		return utils.ErrorResponse(c, fiber.StatusBadRequest, "Invalid request body")
	}
	if skill.Name == "" {
		return utils.ErrorResponse(c, fiber.StatusBadRequest, "Name is required")
	}
	if err := ctrl.skillRepo.Create(&skill); err != nil {
		return utils.ErrorResponse(c, fiber.StatusInternalServerError, "Failed to create skill")
	}
	if ws.HubInstance != nil {
		ws.HubInstance.BroadcastMessage("data:update", map[string]string{"entity": "skills", "action": "create"})
	}
	return utils.SuccessResponse(c, skill, "Skill created")
}

func (ctrl *SkillController) Update(c *fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return utils.ErrorResponse(c, fiber.StatusBadRequest, "Invalid ID")
	}
	existing, err := ctrl.skillRepo.FindByID(id)
	if err != nil {
		return utils.ErrorResponse(c, fiber.StatusNotFound, "Skill not found")
	}
	if err := c.BodyParser(existing); err != nil {
		return utils.ErrorResponse(c, fiber.StatusBadRequest, "Invalid request body")
	}
	if err := ctrl.skillRepo.Update(existing); err != nil {
		return utils.ErrorResponse(c, fiber.StatusInternalServerError, "Failed to update skill")
	}
	if ws.HubInstance != nil {
		ws.HubInstance.BroadcastMessage("data:update", map[string]string{"entity": "skills", "action": "update"})
	}
	return utils.SuccessResponse(c, existing, "Skill updated")
}

func (ctrl *SkillController) Delete(c *fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return utils.ErrorResponse(c, fiber.StatusBadRequest, "Invalid ID")
	}
	if err := ctrl.skillRepo.Delete(id); err != nil {
		return utils.ErrorResponse(c, fiber.StatusInternalServerError, "Failed to delete skill")
	}
	if ws.HubInstance != nil {
		ws.HubInstance.BroadcastMessage("data:update", map[string]string{"entity": "skills", "action": "delete"})
	}
	return utils.SuccessResponse(c, nil, "Skill deleted")
}
