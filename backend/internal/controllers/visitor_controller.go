package controllers

import (
	"strconv"

	"github.com/gofiber/fiber/v2"
	"github.com/portfolio/backend/internal/database"
	"github.com/portfolio/backend/internal/models"
	"github.com/portfolio/backend/internal/repositories"
	"github.com/portfolio/backend/internal/utils"
)

type VisitorController struct {
	visitorRepo *repositories.VisitorRepo
}

func NewVisitorController() *VisitorController {
	return &VisitorController{
		visitorRepo: repositories.NewVisitorRepo(database.DB),
	}
}

func (ctrl *VisitorController) Track(c *fiber.Ctx) error {
	visitor := models.Visitor{
		IPAddress: c.IP(),
		UserAgent: c.Get("User-Agent"),
		Page:      c.FormValue("page", "/"),
		SessionID: c.FormValue("session_id", ""),
	}
	if err := ctrl.visitorRepo.Create(&visitor); err != nil {
		return utils.ErrorResponse(c, fiber.StatusInternalServerError, "Failed to track visitor")
	}
	return utils.SuccessResponse(c, nil, "Visitor tracked")
}

func (ctrl *VisitorController) GetStats(c *fiber.Ctx) error {
	today, _ := ctrl.visitorRepo.CountToday()
	total, _ := ctrl.visitorRepo.CountTotal()
	days, _ := strconv.Atoi(c.Query("days", "30"))
	daily, _ := ctrl.visitorRepo.GetDailyStats(days)
	pages, _ := ctrl.visitorRepo.CountByPage()

	return utils.SuccessResponse(c, fiber.Map{
		"today":  today,
		"total":  total,
		"daily":  daily,
		"pages":  pages,
	}, "Visitor stats")
}

type TranslationController struct {
	transRepo *repositories.TranslationRepo
}

func NewTranslationController() *TranslationController {
	return &TranslationController{
		transRepo: repositories.NewTranslationRepo(database.DB),
	}
}

func (ctrl *TranslationController) GetByLang(c *fiber.Ctx) error {
	lang := c.Params("lang")
	translations, err := ctrl.transRepo.FindByLang(lang)
	if err != nil {
		return utils.ErrorResponse(c, fiber.StatusInternalServerError, "Failed to fetch translations")
	}

	result := make(map[string]string)
	for _, t := range translations {
		result[t.Key] = t.Value
	}

	return utils.SuccessResponse(c, result, "Translations fetched")
}

func (ctrl *TranslationController) Update(c *fiber.Ctx) error {
	var body struct {
		Lang         string            `json:"lang"`
		Translations map[string]string `json:"translations"`
	}
	if err := c.BodyParser(&body); err != nil {
		return utils.ErrorResponse(c, fiber.StatusBadRequest, "Invalid request body")
	}
	for key, value := range body.Translations {
		ctrl.transRepo.Upsert(body.Lang, key, value)
	}
	return utils.SuccessResponse(c, nil, "Translations updated")
}

type UploadController struct {
	// Uses cloudinary via project/cert controllers
}
