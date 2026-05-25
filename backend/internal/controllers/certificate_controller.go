package controllers

import (
	"github.com/gofiber/fiber/v2"
	"time"

	"github.com/google/uuid"
	"github.com/portfolio/backend/internal/database"
	"github.com/portfolio/backend/internal/models"
	"github.com/portfolio/backend/internal/repositories"
	"github.com/portfolio/backend/internal/services"
	"github.com/portfolio/backend/internal/utils"
	ws "github.com/portfolio/backend/internal/websocket"
)

type CertificateController struct {
	certRepo   *repositories.CertificateRepo
	cloudinary *services.CloudinaryService
}

func NewCertificateController(cld *services.CloudinaryService) *CertificateController {
	return &CertificateController{
		certRepo:   repositories.NewCertificateRepo(database.DB),
		cloudinary: cld,
	}
}

func (ctrl *CertificateController) GetAll(c *fiber.Ctx) error {
	search := c.Query("search", "")
	certs, err := ctrl.certRepo.FindAll(search)
	if err != nil {
		return utils.ErrorResponse(c, fiber.StatusInternalServerError, "Failed to fetch certificates")
	}
	return utils.SuccessResponse(c, certs, "Certificates fetched")
}

func (ctrl *CertificateController) GetPublished(c *fiber.Ctx) error {
	certs, err := ctrl.certRepo.FindPublished()
	if err != nil {
		return utils.ErrorResponse(c, fiber.StatusInternalServerError, "Failed to fetch certificates")
	}
	return utils.SuccessResponse(c, certs, "Certificates fetched")
}

func (ctrl *CertificateController) GetById(c *fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return utils.ErrorResponse(c, fiber.StatusBadRequest, "Invalid ID")
	}
	cert, err := ctrl.certRepo.FindByID(id)
	if err != nil {
		return utils.ErrorResponse(c, fiber.StatusNotFound, "Certificate not found")
	}
	return utils.SuccessResponse(c, cert, "Certificate fetched")
}

func (ctrl *CertificateController) Create(c *fiber.Ctx) error {
	var cert models.Certificate
	if err := c.BodyParser(&cert); err != nil {
		return utils.ErrorResponse(c, fiber.StatusBadRequest, "Invalid request body")
	}
	if cert.Title == "" {
		return utils.ErrorResponse(c, fiber.StatusBadRequest, "Title is required")
	}

	if issueDateStr := c.FormValue("issue_date"); issueDateStr != "" {
		if t, err := time.Parse("2006-01-02", issueDateStr); err == nil {
			cert.IssueDate = &t
		}
	}
	if expiryDateStr := c.FormValue("expiry_date"); expiryDateStr != "" {
		if t, err := time.Parse("2006-01-02", expiryDateStr); err == nil {
			cert.ExpiryDate = &t
		}
	}

	file, err := c.FormFile("image")
	if err == nil {
		f, _ := file.Open()
		defer f.Close()
		result, err := ctrl.cloudinary.Upload(f, "certificates", "image")
		if err == nil {
			cert.ImageURL = result.URL
			cert.ImagePublicID = result.PublicID
		}
	}

	if err := ctrl.certRepo.Create(&cert); err != nil {
		return utils.ErrorResponse(c, fiber.StatusInternalServerError, "Failed to create certificate")
	}
	if ws.HubInstance != nil {
		ws.HubInstance.BroadcastMessage("data:update", map[string]string{"entity": "certificates", "action": "create"})
	}
	return utils.SuccessResponse(c, cert, "Certificate created")
}

func (ctrl *CertificateController) Update(c *fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return utils.ErrorResponse(c, fiber.StatusBadRequest, "Invalid ID")
	}
	existing, err := ctrl.certRepo.FindByID(id)
	if err != nil {
		return utils.ErrorResponse(c, fiber.StatusNotFound, "Certificate not found")
	}
	if err := c.BodyParser(existing); err != nil {
		return utils.ErrorResponse(c, fiber.StatusBadRequest, "Invalid request body")
	}

	if issueDateStr := c.FormValue("issue_date"); issueDateStr != "" {
		if t, err := time.Parse("2006-01-02", issueDateStr); err == nil {
			existing.IssueDate = &t
		}
	} else {
		existing.IssueDate = nil
	}

	if expiryDateStr := c.FormValue("expiry_date"); expiryDateStr != "" {
		if t, err := time.Parse("2006-01-02", expiryDateStr); err == nil {
			existing.ExpiryDate = &t
		}
	} else {
		existing.ExpiryDate = nil
	}

	file, err := c.FormFile("image")
	if err == nil {
		f, _ := file.Open()
		defer f.Close()
		result, err := ctrl.cloudinary.Replace(f, existing.ImagePublicID, "certificates", "image")
		if err == nil {
			existing.ImageURL = result.URL
			existing.ImagePublicID = result.PublicID
		}
	}

	if err := ctrl.certRepo.Update(existing); err != nil {
		return utils.ErrorResponse(c, fiber.StatusInternalServerError, "Failed to update certificate")
	}
	if ws.HubInstance != nil {
		ws.HubInstance.BroadcastMessage("data:update", map[string]string{"entity": "certificates", "action": "update"})
	}
	return utils.SuccessResponse(c, existing, "Certificate updated")
}

func (ctrl *CertificateController) Delete(c *fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return utils.ErrorResponse(c, fiber.StatusBadRequest, "Invalid ID")
	}
	cert, err := ctrl.certRepo.FindByID(id)
	if err != nil {
		return utils.ErrorResponse(c, fiber.StatusNotFound, "Certificate not found")
	}
	if cert.ImagePublicID != "" {
		_ = ctrl.cloudinary.Delete(cert.ImagePublicID)
	}
	if err := ctrl.certRepo.Delete(id); err != nil {
		return utils.ErrorResponse(c, fiber.StatusInternalServerError, "Failed to delete certificate")
	}
	if ws.HubInstance != nil {
		ws.HubInstance.BroadcastMessage("data:update", map[string]string{"entity": "certificates", "action": "delete"})
	}
	return utils.SuccessResponse(c, nil, "Certificate deleted")
}
