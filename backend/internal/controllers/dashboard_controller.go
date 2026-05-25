package controllers

import (
	"github.com/gofiber/fiber/v2"
	"github.com/portfolio/backend/internal/database"
	"github.com/portfolio/backend/internal/repositories"
	"github.com/portfolio/backend/internal/utils"
)

type DashboardController struct {
	projectRepo *repositories.ProjectRepo
	msgRepo     *repositories.MessageRepo
	visitorRepo *repositories.VisitorRepo
}

func NewDashboardController() *DashboardController {
	return &DashboardController{
		projectRepo: repositories.NewProjectRepo(database.DB),
		msgRepo:     repositories.NewMessageRepo(database.DB),
		visitorRepo: repositories.NewVisitorRepo(database.DB),
	}
}

func (ctrl *DashboardController) GetStats(c *fiber.Ctx) error {
	totalProjects, _ := ctrl.projectRepo.CountAll()
	unreadMessages, _ := ctrl.msgRepo.CountUnread()
	todayVisitors, _ := ctrl.visitorRepo.CountToday()
	totalVisitors, _ := ctrl.visitorRepo.CountTotal()
	dailyStats, _ := ctrl.visitorRepo.GetDailyStats(30)

	return utils.SuccessResponse(c, fiber.Map{
		"total_projects":  totalProjects,
		"unread_messages": unreadMessages,
		"today_visitors":  todayVisitors,
		"total_visitors":  totalVisitors,
		"daily_stats":     dailyStats,
	}, "Dashboard stats")
}
