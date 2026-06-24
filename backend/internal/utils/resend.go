package utils

import (
	"bytes"
	"encoding/json"
	"fmt"
	"html"
	"io"
	"log"
	"net/http"
	"os"
	"time"
)

type ResendEmailRequest struct {
	From    string   `json:"from"`
	To      []string `json:"to"`
	Subject string   `json:"subject"`
	HTML    string   `json:"html"`
	ReplyTo string   `json:"reply_to,omitempty"`
}

// SendContactNotification triggers an email to the admin via Resend API
func SendContactNotification(name, email, subject, message string) {
	apiKey := os.Getenv("RESEND_API_KEY")
	toEmail := os.Getenv("CONTACT_TO_EMAIL")
	fromEmail := os.Getenv("CONTACT_FROM_EMAIL")

	if apiKey == "" || toEmail == "" || fromEmail == "" {
		log.Println("[Resend Warn] Missing RESEND_API_KEY, CONTACT_TO_EMAIL, or CONTACT_FROM_EMAIL. Email not sent.")
		return
	}

	safeName := html.EscapeString(name)
	safeEmail := html.EscapeString(email)
	safeSubject := html.EscapeString(subject)
	safeMessage := html.EscapeString(message)

	htmlBody := fmt.Sprintf(`
		<!DOCTYPE html>
		<html>
		<head>
			<meta charset="utf-8">
			<meta name="viewport" content="width=device-width, initial-scale=1.0">
		</head>
		<body style="margin: 0; padding: 0; background-color: #f4f7f6; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
			<table width="100%%" border="0" cellpadding="0" cellspacing="0" style="padding: 40px 20px;">
				<tr>
					<td align="center">
						<table width="100%%" border="0" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.05); overflow: hidden;">
							<tr>
								<td style="background-color: #0ea5e9; padding: 30px 40px; text-align: center;">
									<h2 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 600; letter-spacing: 0.5px;">Portfolio / Sultan Nafis</h2>
								</td>
							</tr>
							<tr>
								<td style="padding: 40px;">
									<p style="margin: 0 0 20px 0; color: #334155; font-size: 16px; line-height: 1.6;">You have received a new contact message from your portfolio.</p>
									<table width="100%%" border="0" cellpadding="0" cellspacing="0" style="margin-bottom: 25px;">
										<tr>
											<td style="padding: 8px 0; border-bottom: 1px solid #f1f5f9; color: #64748b; font-size: 14px; width: 80px;"><strong>Name:</strong></td>
											<td style="padding: 8px 0; border-bottom: 1px solid #f1f5f9; color: #0f172a; font-size: 14px;">%s</td>
										</tr>
										<tr>
											<td style="padding: 8px 0; border-bottom: 1px solid #f1f5f9; color: #64748b; font-size: 14px;"><strong>Email:</strong></td>
											<td style="padding: 8px 0; border-bottom: 1px solid #f1f5f9; color: #0ea5e9; font-size: 14px;">%s</td>
										</tr>
										<tr>
											<td style="padding: 8px 0; border-bottom: 1px solid #f1f5f9; color: #64748b; font-size: 14px;"><strong>Subject:</strong></td>
											<td style="padding: 8px 0; border-bottom: 1px solid #f1f5f9; color: #0f172a; font-size: 14px;">%s</td>
										</tr>
										<tr>
											<td style="padding: 8px 0; border-bottom: 1px solid #f1f5f9; color: #64748b; font-size: 14px;"><strong>Date:</strong></td>
											<td style="padding: 8px 0; border-bottom: 1px solid #f1f5f9; color: #0f172a; font-size: 14px;">%s</td>
										</tr>
									</table>
									
									<h3 style="margin: 0 0 15px 0; color: #334155; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">Message:</h3>
									<div style="background-color: #f8fafc; border-left: 4px solid #0ea5e9; padding: 20px; border-radius: 4px; box-shadow: inset 0 2px 4px rgba(0,0,0,0.02);">
										<p style="margin: 0; color: #334155; font-size: 15px; line-height: 1.7; white-space: pre-wrap;">%s</p>
									</div>
								</td>
							</tr>
							<tr>
								<td style="background-color: #f8fafc; padding: 25px 40px; text-align: center; border-top: 1px solid #f1f5f9;">
									<p style="margin: 0; color: #94a3b8; font-size: 13px;">This email was sent securely via your Portfolio Contact Form.</p>
								</td>
							</tr>
						</table>
					</td>
				</tr>
			</table>
		</body>
		</html>
	`, safeName, safeEmail, safeSubject, time.Now().Format("02 Jan 2006, 15:04 MST"), safeMessage)

	payload := ResendEmailRequest{
		From:    fromEmail,
		To:      []string{toEmail},
		Subject: "New Portfolio Message: " + safeSubject,
		HTML:    htmlBody,
		ReplyTo: email,
	}

	payloadBytes, err := json.Marshal(payload)
	if err != nil {
		log.Printf("[Resend Error] Failed to marshal payload: %v\n", err)
		return
	}

	req, err := http.NewRequest("POST", "https://api.resend.com/emails", bytes.NewBuffer(payloadBytes))
	if err != nil {
		log.Printf("[Resend Error] Failed to create request: %v\n", err)
		return
	}

	req.Header.Set("Authorization", "Bearer "+apiKey)
	req.Header.Set("Content-Type", "application/json")

	// Create client with timeout
	client := &http.Client{Timeout: 10 * time.Second}
	
	// Execute the HTTP request asynchronously to avoid blocking the API response
	go func() {
		resp, err := client.Do(req)
		if err != nil {
			log.Printf("[Resend Error] Failed to send email request: %v\n", err)
			return
		}
		defer resp.Body.Close()

		if resp.StatusCode >= 400 {
			bodyBytes, _ := io.ReadAll(resp.Body)
			log.Printf("[Resend Error] API returned status %d: %s\n", resp.StatusCode, string(bodyBytes))
			return
		}
		log.Println("[Resend Info] Contact notification email sent successfully.")
	}()
}

// SendOTPEmail sends an OTP code synchronously. 
// It returns an error if sending fails, allowing the caller to decide the next steps.
func SendOTPEmail(toEmail, subject, title, otp, purposeText string) error {
	apiKey := os.Getenv("RESEND_API_KEY")
	fromEmail := os.Getenv("CONTACT_FROM_EMAIL")

	log.Printf("[DEBUG OTP] RESEND_API_KEY is empty: %v\n", apiKey == "")
	log.Printf("[DEBUG OTP] CONTACT_FROM_EMAIL is empty: %v (value length: %d)\n", fromEmail == "", len(fromEmail))
	log.Printf("[DEBUG OTP] recipient email is empty: %v (value length: %d)\n", toEmail == "", len(toEmail))

	if apiKey == "" || fromEmail == "" {
		return fmt.Errorf("missing RESEND_API_KEY or CONTACT_FROM_EMAIL")
	}

	if toEmail == "" {
		return fmt.Errorf("missing recipient email")
	}

	htmlBody := fmt.Sprintf(`
		<!DOCTYPE html>
		<html>
		<head>
			<meta charset="utf-8">
			<meta name="viewport" content="width=device-width, initial-scale=1.0">
		</head>
		<body style="margin: 0; padding: 0; background-color: #f4f7f6; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
			<table width="100%%" border="0" cellpadding="0" cellspacing="0" style="padding: 40px 20px;">
				<tr>
					<td align="center">
						<table width="100%%" border="0" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.05); overflow: hidden;">
							<tr>
								<td style="background-color: #0ea5e9; padding: 30px 40px; text-align: center;">
									<h2 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 600; letter-spacing: 0.5px;">Portfolio / Sultan Nafis</h2>
								</td>
							</tr>
							<tr>
								<td style="padding: 50px 40px; text-align: center;">
									<h3 style="margin: 0 0 20px 0; color: #0f172a; font-size: 20px;">%s</h3>
									<p style="margin: 0 0 35px 0; color: #64748b; font-size: 15px; line-height: 1.6;">
										%s
									</p>
									<div style="background-color: #f1f5f9; border: 1px dashed #cbd5e1; border-radius: 8px; padding: 20px 30px; display: inline-block; margin-bottom: 35px;">
										<h1 style="margin: 0; color: #0ea5e9; font-size: 36px; font-family: monospace; letter-spacing: 8px; font-weight: 700;">%s</h1>
									</div>
									<div style="background-color: #fffbeb; border-left: 4px solid #f59e0b; padding: 15px; text-align: left; border-radius: 4px;">
										<p style="margin: 0; color: #92400e; font-size: 13px; line-height: 1.5;">
											<strong>Security Warning:</strong> This code is valid for <strong>5 minutes</strong>. Do not share this code with anyone. If you didn't request this code, please secure your account.
										</p>
									</div>
								</td>
							</tr>
							<tr>
								<td style="background-color: #f8fafc; padding: 25px 40px; text-align: center; border-top: 1px solid #f1f5f9;">
									<p style="margin: 0; color: #94a3b8; font-size: 12px;">This is an automated message. Please do not reply directly to this email.</p>
								</td>
							</tr>
						</table>
					</td>
				</tr>
			</table>
		</body>
		</html>
	`, title, purposeText, otp)

	payload := ResendEmailRequest{
		From:    fromEmail,
		To:      []string{toEmail},
		Subject: subject,
		HTML:    htmlBody,
	}

	payloadBytes, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("failed to marshal payload: %w", err)
	}

	req, err := http.NewRequest("POST", "https://api.resend.com/emails", bytes.NewBuffer(payloadBytes))
	if err != nil {
		return fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Authorization", "Bearer "+apiKey)
	req.Header.Set("Content-Type", "application/json")

	// Synchronous client with a short timeout (e.g. 5 seconds) to prevent hanging the login request.
	client := &http.Client{Timeout: 5 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		log.Printf("[DEBUG OTP] Resend request error: %v\n", err)
		return fmt.Errorf("failed to send email request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 400 {
		bodyBytes, _ := io.ReadAll(resp.Body)
		log.Printf("[DEBUG OTP] Resend returned status %d. Body: %s\n", resp.StatusCode, string(bodyBytes))
		return fmt.Errorf("API returned status %d: %s", resp.StatusCode, string(bodyBytes))
	}

	return nil
}
