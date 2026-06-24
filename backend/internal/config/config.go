package config

import (
	"os"
	"strings"

	"github.com/joho/godotenv"
)

type Config struct {
	Port              string
	AppEnv            string
	DatabaseURL       string
	JWTSecret         string
	JWTExpiry         string
	CloudinaryCloudName string
	CloudinaryAPIKey    string
	CloudinaryAPISecret string
	CloudinaryURL       string
	FrontendURL       string
	AllowedOrigins    string
	AdminUsername      string
	AdminEmail        string
	AdminPassword     string
}

var AppConfig *Config

func LoadConfig() {
	godotenv.Load()

	AppConfig = &Config{
		Port:              getEnv("PORT", "8080"),
		AppEnv:            getEnv("APP_ENV", "development"),
		DatabaseURL:       getEnv("DATABASE_URL", ""),
		JWTSecret:         getEnv("JWT_SECRET", "secret"),
		JWTExpiry:         getEnv("JWT_EXPIRY", "24h"),
		CloudinaryCloudName: getEnv("CLOUDINARY_CLOUD_NAME", ""),
		CloudinaryAPIKey:    getEnv("CLOUDINARY_API_KEY", ""),
		CloudinaryURL:       getEnv("CLOUDINARY_URL", ""),
		FrontendURL:       getEnv("FRONTEND_URL", "http://localhost:3000"),
		AllowedOrigins:    parseOrigins(getEnv("ALLOWED_ORIGINS", "http://localhost:3000")),
		AdminUsername:      getEnv("ADMIN_USERNAME", "admin"),
		AdminEmail:        getEnv("ADMIN_EMAIL", "admin@portfolio.com"),
		AdminPassword:     getEnv("ADMIN_PASSWORD", "admin123"),
	}
}

func parseOrigins(raw string) string {
	parts := strings.Split(raw, ",")
	var origins []string
	for _, p := range parts {
		trimmed := strings.TrimSpace(p)
		if trimmed != "" {
			origins = append(origins, trimmed)
		}
	}
	return strings.Join(origins, ", ")
}

func getEnv(key, fallback string) string {
	if value, exists := os.LookupEnv(key); exists {
		return value
	}
	return fallback
}
