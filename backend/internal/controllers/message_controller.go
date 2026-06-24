package controllers

import (
	"math"
	"strconv"
	"log"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/portfolio/backend/internal/database"
	"github.com/portfolio/backend/internal/models"
	"github.com/portfolio/backend/internal/repositories"
	"github.com/portfolio/backend/internal/utils"
	ws "github.com/portfolio/backend/internal/websocket"
)

type MessageController struct {
	msgRepo *repositories.MessageRepo
}

func NewMessageController() *MessageController {
	return &MessageController{
		msgRepo: repositories.NewMessageRepo(database.DB),
	}
}

func (ctrl *MessageController) GetAll(c *fiber.Ctx) error {
	page, _ := strconv.Atoi(c.Query("page", "1"))
	perPage, _ := strconv.Atoi(c.Query("per_page", "20"))

	var isRead *bool
	if c.Query("is_read") != "" {
		r := c.Query("is_read") == "true"
		isRead = &r
	}

	messages, total, err := ctrl.msgRepo.FindAll(page, perPage, isRead)
	if err != nil {
		return utils.ErrorResponse(c, fiber.StatusInternalServerError, "Failed to fetch messages")
	}

	totalPages := int(math.Ceil(float64(total) / float64(perPage)))
	return utils.PaginatedResponse(c, messages, &utils.Meta{
		Page: page, PerPage: perPage, Total: total, TotalPages: totalPages,
	})
}

func (ctrl *MessageController) Create(c *fiber.Ctx) error {
	type MessagePayload struct {
		Name           string `json:"name"`
		Email          string `json:"email"`
		Subject        string `json:"subject"`
		Message        string `json:"message"`
		TurnstileToken string `json:"turnstileToken"`
	}

	var payload MessagePayload
	if err := c.BodyParser(&payload); err != nil {
		return utils.ErrorResponse(c, fiber.StatusBadRequest, "Invalid request body")
	}

	if payload.Name == "" || payload.Email == "" || payload.Message == "" {
		return utils.ErrorResponse(c, fiber.StatusBadRequest, "Name, email, and message are required")
	}

	// Security Hook: Turnstile Validation
	secSettings := utils.GetSecuritySettings()
	if secSettings.TurnstileEnabled {
		if payload.TurnstileToken == "" {
			return utils.ErrorResponse(c, fiber.StatusBadRequest, "Verifikasi keamanan gagal. Silakan coba lagi.")
		}
		
		isValid, err := utils.VerifyTurnstile(payload.TurnstileToken, c.IP())
		if err != nil {
			log.Printf("[Turnstile Warn] %v\n", err) 
		}
		if !isValid {
			return utils.ErrorResponse(c, fiber.StatusBadRequest, "Verifikasi keamanan gagal. Silakan coba lagi.")
		}
	}

	// Security Hook: Rate Limiting
	if secSettings.RateLimitEnabled {
		hash := utils.GenerateVisitorHash(c.IP(), c.Get("User-Agent"), "contact")
		key := "rl:contact:" + hash
		
		val, err := utils.RedisIncr(key)
		if err != nil {
			log.Printf("[Redis Warn] failed to incr rate limit: %v\n", err)
		} else {
			if val == 1 {
				utils.RedisExpire(key, 600) // 10 minutes TTL
			}
			if val > 3 {
				return utils.ErrorResponse(c, fiber.StatusTooManyRequests, "Terlalu banyak permintaan. Silakan coba lagi nanti.")
			}
		}
	}

	msg := models.Message{
		Name:    payload.Name,
		Email:   payload.Email,
		Subject: payload.Subject,
		Message: payload.Message,
	}

	if err := ctrl.msgRepo.Create(&msg); err != nil {
		return utils.ErrorResponse(c, fiber.StatusInternalServerError, "Failed to send message")
	}

	// Broadcast new message notification
	if ws.HubInstance != nil {
		ws.HubInstance.BroadcastMessage("message:new", map[string]interface{}{
			"id":      msg.ID,
			"name":    msg.Name,
			"subject": msg.Subject,
		})
	}

	// Security Hook: Resend Email Notification
	if secSettings.ResendEmailEnabled {
		utils.SendContactNotification(msg.Name, msg.Email, msg.Subject, msg.Message)
	}

	return utils.SuccessResponse(c, msg, "Message sent successfully")
}

func (ctrl *MessageController) MarkAsRead(c *fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return utils.ErrorResponse(c, fiber.StatusBadRequest, "Invalid ID")
	}
	if err := ctrl.msgRepo.MarkAsRead(id); err != nil {
		return utils.ErrorResponse(c, fiber.StatusInternalServerError, "Failed to update message")
	}
	return utils.SuccessResponse(c, nil, "Message marked as read")
}

func (ctrl *MessageController) Delete(c *fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return utils.ErrorResponse(c, fiber.StatusBadRequest, "Invalid ID")
	}
	if err := ctrl.msgRepo.Delete(id); err != nil {
		return utils.ErrorResponse(c, fiber.StatusInternalServerError, "Failed to delete message")
	}
	return utils.SuccessResponse(c, nil, "Message deleted")
}

func (ctrl *MessageController) CountUnread(c *fiber.Ctx) error {
	count, err := ctrl.msgRepo.CountUnread()
	if err != nil {
		return utils.ErrorResponse(c, fiber.StatusInternalServerError, "Failed to count messages")
	}
	return utils.SuccessResponse(c, fiber.Map{"count": count}, "Unread count")
}
