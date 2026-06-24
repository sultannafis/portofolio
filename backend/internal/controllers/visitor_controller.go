package controllers

import (
	"log"
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
	type TrackPayload struct {
		Page      string `json:"page"`
		SessionID string `json:"session_id"`
	}
	var payload TrackPayload
	if err := c.BodyParser(&payload); err != nil {
		payload.Page = c.FormValue("page", "/")
		payload.SessionID = c.FormValue("session_id", "")
	}
	
	if payload.Page == "" {
		payload.Page = "/"
	}

	secSettings := utils.GetSecuritySettings()
	userAgent := c.Get("User-Agent")

	// 1. Admin Exclusion
	if secSettings.ExcludeAdminVisitsEnabled {
		if utils.IsAdminRequest(c) {
			return utils.SuccessResponse(c, nil, "Admin excluded from tracking")
		}
	}

	// 2. Bot Protection
	if secSettings.VisitorProtectionEnabled && utils.IsBot(userAgent) {
		return utils.SuccessResponse(c, nil, "Bot skipped")
	}

	hashInfo := utils.GenerateVisitorHash(c.IP(), userAgent, payload.Page)

	// 3. Rate Limit
	if secSettings.RateLimitEnabled {
		rlKey := "rl:visitor:" + hashInfo
		val, err := utils.RedisIncr(rlKey)
		if err != nil {
			log.Printf("[Redis Warn] failed to incr visitor rate limit: %v\n", err)
		} else {
			if val == 1 {
				utils.RedisExpire(rlKey, 600) // 10 minutes TTL
			}
			if val > 30 {
				return utils.ErrorResponse(c, fiber.StatusTooManyRequests, "Terlalu banyak permintaan.")
			}
		}
	}

	// 4. Cooldown Dedupe
	if secSettings.VisitorProtectionEnabled {
		cdKey := "cooldown:visitor:" + hashInfo
		setSuccess, err := utils.RedisSetNX(cdKey, "1", 21600) // 6 hours TTL
		if err != nil {
			log.Printf("[Redis Warn] failed to set visitor cooldown: %v\n", err)
		} else if !setSuccess {
			// Already visited within cooldown period
			return utils.SuccessResponse(c, nil, "Visitor tracked (cached)")
		}
	}

	ipToSave := c.IP()
	if secSettings.VisitorProtectionEnabled {
		ipToSave = "hash-" + hashInfo[:12] // Save partial hash to protect raw IP privacy
	}

	visitor := models.Visitor{
		IPAddress: ipToSave,
		UserAgent: userAgent,
		Page:      payload.Page,
		SessionID: payload.SessionID,
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
