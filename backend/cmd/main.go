package main

import (
	"fmt"
	"log"

	"github.com/gofiber/fiber/v2"
	"github.com/portfolio/backend/internal/config"
	"github.com/portfolio/backend/internal/database"
	"github.com/portfolio/backend/internal/middleware"
	"github.com/portfolio/backend/internal/models"
	"github.com/portfolio/backend/internal/routes"
	"github.com/portfolio/backend/internal/services"
	"github.com/portfolio/backend/internal/utils"
	ws "github.com/portfolio/backend/internal/websocket"
)

func main() {
	// Load config
	config.LoadConfig()

	// Connect database
	database.Connect()

	// Run migrations
	database.Migrate()

	// Seed admin user
	seedAdmin()

	// Init Cloudinary
	cld := services.NewCloudinaryService()

	// Init WebSocket hub
	hub := ws.NewHub()
	go hub.Run()

	// Create Fiber app
	app := fiber.New(fiber.Config{
		BodyLimit: 50 * 1024 * 1024, // 50MB
	})

	// Middleware
	app.Use(middleware.LoggerMiddleware())
	app.Use(middleware.CORSMiddleware())

	// Setup routes
	routes.SetupRoutes(app, hub, cld)

	// Health check
	app.Get("/health", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{
			"status":  "ok",
			"message": "Portfolio API is running",
		})
	})

	// Start server
	port := config.AppConfig.Port
	fmt.Printf("🚀 Server starting on port %s\n", port)
	log.Fatal(app.Listen(":" + port))
}

func seedAdmin() {
	userRepo := database.DB
	var count int64
	userRepo.Model(&models.User{}).Count(&count)

	if count == 0 {
		hashedPassword, _ := utils.HashPassword(config.AppConfig.AdminPassword)
		admin := models.User{
			Username: config.AppConfig.AdminUsername,
			Email:    config.AppConfig.AdminEmail,
			Password: hashedPassword,
			Role:     "admin",
		}
		userRepo.Create(&admin)
		fmt.Println("✅ Admin user seeded successfully")
	}
}
