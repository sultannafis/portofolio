package config

import (
	"os"
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
		CloudinaryAPISecret: getEnv("CLOUDINARY_API_SECRET", ""),
		CloudinaryURL:       getEnv("CLOUDINARY_URL", ""),
		FrontendURL:       getEnv("FRONTEND_URL", "http://localhost:3000"),
		AdminUsername:      getEnv("ADMIN_USERNAME", "admin"),
		AdminEmail:        getEnv("ADMIN_EMAIL", "admin@portfolio.com"),
		AdminPassword:     getEnv("ADMIN_PASSWORD", "admin123"),
	}
}

func getEnv(key, fallback string) string {
	if value, exists := os.LookupEnv(key); exists {
		return value
	}
	return fallback
}
