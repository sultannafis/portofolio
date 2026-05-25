package routes

import (
	"github.com/gofiber/fiber/v2"
	"github.com/portfolio/backend/internal/controllers"
	"github.com/portfolio/backend/internal/middleware"
	"github.com/portfolio/backend/internal/services"
	ws "github.com/portfolio/backend/internal/websocket"
)

func SetupRoutes(app *fiber.App, hub *ws.Hub, cld *services.CloudinaryService) {
	// Controllers
	authCtrl := controllers.NewAuthController()
	projectCtrl := controllers.NewProjectController(cld)
	skillCtrl := controllers.NewSkillController()
	certCtrl := controllers.NewCertificateController(cld)
	expCtrl := controllers.NewExperienceController(cld)
	msgCtrl := controllers.NewMessageController()
	visitorCtrl := controllers.NewVisitorController()
	settingCtrl := controllers.NewSettingController(cld)
	transCtrl := controllers.NewTranslationController()
	dashCtrl := controllers.NewDashboardController()

	// WebSocket
	app.Use("/ws", func(c *fiber.Ctx) error {
		if c.Get("Upgrade") == "websocket" {
			return c.Next()
		}
		return fiber.ErrUpgradeRequired
	})
	app.Get("/ws", ws.HandleWebSocket(hub))

	// API Group
	api := app.Group("/api")

	// Auth
	auth := api.Group("/auth")
	auth.Post("/login", authCtrl.Login)

	// Public endpoints
	api.Get("/projects", projectCtrl.GetPublished)
	api.Get("/projects/:slug", projectCtrl.GetBySlug)
	api.Get("/skills", skillCtrl.GetPublished)
	api.Get("/certificates", certCtrl.GetPublished)
	api.Get("/experiences", expCtrl.GetPublished)
	api.Post("/messages", msgCtrl.Create)
	api.Post("/analytics/track", visitorCtrl.Track)
	api.Get("/analytics/visitors", visitorCtrl.GetStats)
	api.Get("/settings", settingCtrl.GetAll)
	api.Get("/translations/:lang", transCtrl.GetByLang)

	// Admin protected routes
	admin := api.Group("/admin", middleware.AuthMiddleware())

	// Auth protected
	admin.Get("/me", authCtrl.Me)
	admin.Put("/profile", authCtrl.UpdateProfile)

	// Dashboard
	admin.Get("/dashboard/stats", dashCtrl.GetStats)

	// Projects CRUD
	admin.Get("/projects", projectCtrl.GetAll)
	admin.Get("/projects/:id", projectCtrl.GetById)
	admin.Post("/projects", projectCtrl.Create)
	admin.Put("/projects/:id", projectCtrl.Update)
	admin.Delete("/projects/:id", projectCtrl.Delete)
	admin.Post("/projects/:id/media", projectCtrl.AddMedia)
	admin.Delete("/projects/:id/media/:mediaId", projectCtrl.DeleteMedia)

	// Skills CRUD
	admin.Get("/skills", skillCtrl.GetAll)
	admin.Get("/skills/:id", skillCtrl.GetById)
	admin.Post("/skills", skillCtrl.Create)
	admin.Put("/skills/:id", skillCtrl.Update)
	admin.Delete("/skills/:id", skillCtrl.Delete)

	// Certificates CRUD
	admin.Get("/certificates", certCtrl.GetAll)
	admin.Get("/certificates/:id", certCtrl.GetById)
	admin.Post("/certificates", certCtrl.Create)
	admin.Put("/certificates/:id", certCtrl.Update)
	admin.Delete("/certificates/:id", certCtrl.Delete)

	// Experiences CRUD
	admin.Get("/experiences", expCtrl.GetAll)
	admin.Get("/experiences/:id", expCtrl.GetById)
	admin.Post("/experiences", expCtrl.Create)
	admin.Put("/experiences/:id", expCtrl.Update)
	admin.Delete("/experiences/:id", expCtrl.Delete)

	// Messages
	admin.Get("/messages", msgCtrl.GetAll)
	admin.Get("/messages/unread", msgCtrl.CountUnread)
	admin.Put("/messages/:id/read", msgCtrl.MarkAsRead)
	admin.Delete("/messages/:id", msgCtrl.Delete)

	// Settings
	admin.Put("/settings", settingCtrl.Update)
	admin.Post("/settings/upload", settingCtrl.UploadProfileImage)

	// Translations
	admin.Put("/translations", transCtrl.Update)
}
