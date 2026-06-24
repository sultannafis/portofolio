package utils

import (
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"strings"
	"time"
)

type TurnstileResponse struct {
	Success    bool     `json:"success"`
	ErrorCodes []string `json:"error-codes"`
	ChallengeTs string   `json:"challenge_ts"`
	Hostname   string   `json:"hostname"`
	Action     string   `json:"action"`
	Cdata      string   `json:"cdata"`
}

// VerifyTurnstile checks a given token against the Cloudflare siteverify endpoint.
func VerifyTurnstile(token string, remoteIP string) (bool, error) {
	secretKey := os.Getenv("TURNSTILE_SECRET_KEY")
	if secretKey == "" {
		return false, errors.New("TURNSTILE_SECRET_KEY is empty")
	}

	apiURL := "https://challenges.cloudflare.com/turnstile/v0/siteverify"

	// Prepare the payload
	data := url.Values{}
	data.Set("secret", secretKey)
	data.Set("response", token)
	if remoteIP != "" {
		data.Set("remoteip", remoteIP)
	}

	// Make the request
	client := &http.Client{Timeout: 10 * time.Second}
	req, err := http.NewRequest("POST", apiURL, strings.NewReader(data.Encode()))
	if err != nil {
		return false, fmt.Errorf("failed to create turnstile request: %w", err)
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")

	resp, err := client.Do(req)
	if err != nil {
		return false, fmt.Errorf("failed to execute turnstile request: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return false, fmt.Errorf("failed to read turnstile response: %w", err)
	}

	var turnstileResp TurnstileResponse
	if err := json.Unmarshal(body, &turnstileResp); err != nil {
		return false, fmt.Errorf("failed to unmarshal turnstile response: %w", err)
	}

	if !turnstileResp.Success {
		return false, fmt.Errorf("turnstile validation failed with error codes: %v", turnstileResp.ErrorCodes)
	}

	return true, nil
}
