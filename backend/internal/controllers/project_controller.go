package controllers

import (
	"math"
	"strconv"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/portfolio/backend/internal/database"
	"github.com/portfolio/backend/internal/models"
	"github.com/portfolio/backend/internal/repositories"
	"github.com/portfolio/backend/internal/services"
	"github.com/portfolio/backend/internal/utils"
	ws "github.com/portfolio/backend/internal/websocket"
)

type ProjectController struct {
	projectRepo *repositories.ProjectRepo
	cloudinary  *services.CloudinaryService
}

func NewProjectController(cld *services.CloudinaryService) *ProjectController {
	return &ProjectController{
		projectRepo: repositories.NewProjectRepo(database.DB),
		cloudinary:  cld,
	}
}

func (ctrl *ProjectController) GetAll(c *fiber.Ctx) error {
	page, _ := strconv.Atoi(c.Query("page", "1"))
	perPage, _ := strconv.Atoi(c.Query("per_page", "10"))
	search := c.Query("search", "")
	category := c.Query("category", "")

	var published *bool
	if c.Query("published") != "" {
		p := c.Query("published") == "true"
		published = &p
	}

	projects, total, err := ctrl.projectRepo.FindAll(page, perPage, search, category, published)
	if err != nil {
		return utils.ErrorResponse(c, fiber.StatusInternalServerError, "Failed to fetch projects")
	}

	totalPages := int(math.Ceil(float64(total) / float64(perPage)))

	return utils.PaginatedResponse(c, projects, &utils.Meta{
		Page:       page,
		PerPage:    perPage,
		Total:      total,
		TotalPages: totalPages,
	})
}

func (ctrl *ProjectController) GetPublished(c *fiber.Ctx) error {
	published := true
	projects, _, err := ctrl.projectRepo.FindAll(1, 100, "", "", &published)
	if err != nil {
		return utils.ErrorResponse(c, fiber.StatusInternalServerError, "Failed to fetch projects")
	}
	return utils.SuccessResponse(c, projects, "Projects fetched")
}

func (ctrl *ProjectController) GetBySlug(c *fiber.Ctx) error {
	slug := c.Params("slug")
	project, err := ctrl.projectRepo.FindBySlug(slug)
	if err != nil {
		return utils.ErrorResponse(c, fiber.StatusNotFound, "Project not found")
	}
	return utils.SuccessResponse(c, project, "Project fetched")
}

func (ctrl *ProjectController) GetById(c *fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return utils.ErrorResponse(c, fiber.StatusBadRequest, "Invalid ID")
	}
	project, err := ctrl.projectRepo.FindByID(id)
	if err != nil {
		return utils.ErrorResponse(c, fiber.StatusNotFound, "Project not found")
	}
	return utils.SuccessResponse(c, project, "Project fetched")
}

func (ctrl *ProjectController) Create(c *fiber.Ctx) error {
	var project models.Project
	if err := c.BodyParser(&project); err != nil {
		return utils.ErrorResponse(c, fiber.StatusBadRequest, "Invalid request body: " + err.Error())
	}

	if project.Title == "" {
		return utils.ErrorResponse(c, fiber.StatusBadRequest, "Title is required")
	}

	// Explicitly parse boolean from FormData since BodyParser might miss it
	project.IsPublished = c.FormValue("is_published") == "true"

	project.Slug = utils.GenerateSlug(project.Title)

	// Handle thumbnail upload
	file, err := c.FormFile("thumbnail")
	if err == nil {
		f, _ := file.Open()
		defer f.Close()
		result, err := ctrl.cloudinary.Upload(f, "projects/thumbnails", "image")
		if err == nil {
			project.ThumbnailURL = result.URL
			project.ThumbnailPublicID = result.PublicID
		}
	}

	if err := ctrl.projectRepo.Create(&project); err != nil {
		return utils.ErrorResponse(c, fiber.StatusInternalServerError, "Failed to create project")
	}

	if ws.HubInstance != nil {
		ws.HubInstance.BroadcastMessage("data:update", map[string]string{"entity": "projects", "action": "create"})
	}

	return utils.SuccessResponse(c, project, "Project created")
}

func (ctrl *ProjectController) Update(c *fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return utils.ErrorResponse(c, fiber.StatusBadRequest, "Invalid ID")
	}

	existing, err := ctrl.projectRepo.FindByID(id)
	if err != nil {
		return utils.ErrorResponse(c, fiber.StatusNotFound, "Project not found")
	}

	if err := c.BodyParser(existing); err != nil {
		return utils.ErrorResponse(c, fiber.StatusBadRequest, "Invalid request body")
	}

	// Explicitly parse boolean from FormData
	existing.IsPublished = c.FormValue("is_published") == "true"

	// Handle thumbnail replacement
	file, err := c.FormFile("thumbnail")
	if err == nil {
		f, _ := file.Open()
		defer f.Close()
		result, err := ctrl.cloudinary.Replace(f, existing.ThumbnailPublicID, "projects/thumbnails", "image")
		if err == nil {
			existing.ThumbnailURL = result.URL
			existing.ThumbnailPublicID = result.PublicID
		}
	}

	existing.Slug = utils.GenerateSlug(existing.Title)

	if err := ctrl.projectRepo.Update(existing); err != nil {
		return utils.ErrorResponse(c, fiber.StatusInternalServerError, "Failed to update project")
	}

	if ws.HubInstance != nil {
		ws.HubInstance.BroadcastMessage("data:update", map[string]string{"entity": "projects", "action": "update"})
	}

	return utils.SuccessResponse(c, existing, "Project updated")
}

func (ctrl *ProjectController) Delete(c *fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return utils.ErrorResponse(c, fiber.StatusBadRequest, "Invalid ID")
	}

	project, err := ctrl.projectRepo.FindByID(id)
	if err != nil {
		return utils.ErrorResponse(c, fiber.StatusNotFound, "Project not found")
	}

	// Delete thumbnail from Cloudinary
	if project.ThumbnailPublicID != "" {
		_ = ctrl.cloudinary.Delete(project.ThumbnailPublicID)
	}

	// Delete all media from Cloudinary
	for _, media := range project.Media {
		_ = ctrl.cloudinary.Delete(media.PublicID)
	}

	if err := ctrl.projectRepo.Delete(id); err != nil {
		return utils.ErrorResponse(c, fiber.StatusInternalServerError, "Failed to delete project")
	}

	if ws.HubInstance != nil {
		ws.HubInstance.BroadcastMessage("data:update", map[string]string{"entity": "projects", "action": "delete"})
	}

	return utils.SuccessResponse(c, nil, "Project deleted")
}

func (ctrl *ProjectController) AddMedia(c *fiber.Ctx) error {
	projectID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return utils.ErrorResponse(c, fiber.StatusBadRequest, "Invalid project ID")
	}

	form, err := c.MultipartForm()
	if err != nil {
		return utils.ErrorResponse(c, fiber.StatusBadRequest, "Invalid form data")
	}

	files := form.File["files"]
	mediaType := c.FormValue("media_type", "image")
	var uploaded []models.ProjectMedia

	for _, file := range files {
		f, err := file.Open()
		if err != nil {
			continue
		}

		resourceType := "image"
		if mediaType == "video" {
			resourceType = "video"
		}

		result, err := ctrl.cloudinary.Upload(f, "projects/gallery", resourceType)
		f.Close()
		if err != nil {
			continue
		}

		media := models.ProjectMedia{
			ProjectID: projectID,
			MediaURL:  result.URL,
			PublicID:  result.PublicID,
			MediaType: mediaType,
		}

		if err := ctrl.projectRepo.AddMedia(&media); err == nil {
			uploaded = append(uploaded, media)
		}
	}

	return utils.SuccessResponse(c, uploaded, "Media uploaded")
}

func (ctrl *ProjectController) DeleteMedia(c *fiber.Ctx) error {
	mediaID, err := uuid.Parse(c.Params("mediaId"))
	if err != nil {
		return utils.ErrorResponse(c, fiber.StatusBadRequest, "Invalid media ID")
	}

	media, err := ctrl.projectRepo.FindMediaByID(mediaID)
	if err != nil {
		return utils.ErrorResponse(c, fiber.StatusNotFound, "Media not found")
	}

	// Delete from Cloudinary
	_ = ctrl.cloudinary.Delete(media.PublicID)

	if err := ctrl.projectRepo.DeleteMedia(mediaID); err != nil {
		return utils.ErrorResponse(c, fiber.StatusInternalServerError, "Failed to delete media")
	}

	return utils.SuccessResponse(c, nil, "Media deleted")
}
