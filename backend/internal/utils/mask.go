package utils

import "strings"

// MaskEmail masks an email string for secure display.
// e.g., "sultannafis1324@gmail.com" -> "su***@gmail.com"
func MaskEmail(email string) string {
	parts := strings.Split(email, "@")
	if len(parts) != 2 {
		return email
	}

	userPart := parts[0]
	domainPart := parts[1]

	if len(userPart) <= 2 {
		return "***@" + domainPart
	}

	maskedUser := userPart[:2] + "***"
	return maskedUser + "@" + domainPart
}
