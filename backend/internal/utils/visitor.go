package utils

import (
	"crypto/sha256"
	"encoding/hex"
	"os"
	"strings"

	"github.com/gofiber/fiber/v2"
)

// GenerateVisitorHash creates a secure SHA-256 hash from visitor info.
func GenerateVisitorHash(ip, userAgent, path string) string {
	secret := os.Getenv("VISITOR_HASH_SECRET")
	if secret == "" {
		// Fallback secret if not set (or could disable tracking, handled by caller)
		secret = "fallback_secret" 
	}
	data := ip + "|" + userAgent + "|" + path + "|" + secret
	hash := sha256.Sum256([]byte(data))
	return hex.EncodeToString(hash[:])
}

// IsBot checks if the given User-Agent is a known bot.
func IsBot(userAgent string) bool {
	ua := strings.ToLower(userAgent)
	bots := []string{
		"bot",
		"crawler",
		"spider",
		"headless",
		"curl",
		"wget",
		"python-requests",
		"playwright",
		"puppeteer",
	}

	for _, bot := range bots {
		if strings.Contains(ua, bot) {
			return true
		}
	}
	return false
}

// IsAdminRequest inspects the Authorization header to determine if the request is from an admin.
func IsAdminRequest(c *fiber.Ctx) bool {
	authHeader := c.Get("Authorization")
	if authHeader == "" {
		return false
	}

	parts := strings.Split(authHeader, " ")
	if len(parts) != 2 || parts[0] != "Bearer" {
		return false
	}

	token := parts[1]
	claims, err := ValidateToken(token)
	if err != nil {
		return false
	}

	// Assuming 'admin' is the role for admins
	if claims.Role == "admin" || claims.Role == "superadmin" {
		return true
	}
	
	return false
}
