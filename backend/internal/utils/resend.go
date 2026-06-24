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
		<html lang="id">
		<head>
			<meta charset="utf-8">
			<meta name="viewport" content="width=device-width, initial-scale=1.0">
			<meta name="color-scheme" content="light dark">
			<meta name="supported-color-schemes" content="light dark">
			<style>
				:root { color-scheme: light dark; supported-color-schemes: light dark; }
				body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
				.card { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0; }
				@media (prefers-color-scheme: dark) {
					.bg-main { background-color: #0f172a !important; }
					.card { background-color: #1e293b !important; border-color: #334155 !important; }
					.text-main { color: #f8fafc !important; }
					.text-muted { color: #94a3b8 !important; }
					.box-bg { background-color: #334155 !important; border-color: #475569 !important; }
					.border-b { border-bottom-color: #334155 !important; }
					.footer-bg { background-color: #0f172a !important; border-top-color: #1e293b !important; }
				}
				@media screen and (max-width: 600px) {
					.p-mob { padding: 30px 20px !important; }
				}
			</style>
		</head>
		<body class="bg-main" style="background-color: #f8fafc; -webkit-font-smoothing: antialiased;">
			<table width="100%%" border="0" cellpadding="0" cellspacing="0" style="padding: 30px 15px;">
				<tr>
					<td align="center">
						<table width="100%%" border="0" cellpadding="0" cellspacing="0" class="card" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0;">
							<tr>
								<td style="background-color: #0ea5e9; padding: 25px 20px; text-align: center;">
									<h2 style="margin: 0; color: #ffffff; font-size: 22px; font-weight: 600;">Portfolio - Sultan Nafis</h2>
								</td>
							</tr>
							<tr>
								<td class="p-mob" style="padding: 40px 30px;">
									<p class="text-main" style="margin: 0 0 25px 0; color: #0f172a; font-size: 16px; line-height: 1.6; text-align: center;">Anda telah menerima pesan kontak baru dari portofolio Anda.</p>
									<table width="100%%" border="0" cellpadding="0" cellspacing="0" style="margin-bottom: 30px;">
										<tr>
											<td class="border-b text-muted" style="padding: 10px 0; border-bottom: 1px solid #e2e8f0; color: #64748b; font-size: 14px; width: 80px;"><strong>Nama:</strong></td>
											<td class="border-b text-main" style="padding: 10px 0; border-bottom: 1px solid #e2e8f0; color: #0f172a; font-size: 14px;"><strong>%s</strong></td>
										</tr>
										<tr>
											<td class="border-b text-muted" style="padding: 10px 0; border-bottom: 1px solid #e2e8f0; color: #64748b; font-size: 14px;"><strong>Email:</strong></td>
											<td class="border-b text-main" style="padding: 10px 0; border-bottom: 1px solid #e2e8f0; color: #0ea5e9; font-size: 14px;"><strong>%s</strong></td>
										</tr>
										<tr>
											<td class="border-b text-muted" style="padding: 10px 0; border-bottom: 1px solid #e2e8f0; color: #64748b; font-size: 14px;"><strong>Subjek:</strong></td>
											<td class="border-b text-main" style="padding: 10px 0; border-bottom: 1px solid #e2e8f0; color: #0f172a; font-size: 14px;"><strong>%s</strong></td>
										</tr>
										<tr>
											<td class="border-b text-muted" style="padding: 10px 0; border-bottom: 1px solid #e2e8f0; color: #64748b; font-size: 14px;"><strong>Tanggal:</strong></td>
											<td class="border-b text-main" style="padding: 10px 0; border-bottom: 1px solid #e2e8f0; color: #0f172a; font-size: 14px;"><strong>%s</strong></td>
										</tr>
									</table>
									
									<h3 class="text-main" style="margin: 0 0 10px 0; color: #0f172a; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">Pesan:</h3>
									<table width="100%%" border="0" cellpadding="0" cellspacing="0" class="box-bg" style="background-color: #f1f5f9; border-left: 4px solid #0ea5e9; border-radius: 4px;">
										<tr>
											<td style="padding: 20px;">
												<p class="text-main" style="margin: 0; color: #334155; font-size: 15px; line-height: 1.7; white-space: pre-wrap;">%s</p>
											</td>
										</tr>
									</table>
								</td>
							</tr>
							<tr>
								<td class="footer-bg" style="background-color: #f8fafc; padding: 20px; text-align: center; border-top: 1px solid #e2e8f0;">
									<p class="text-muted" style="margin: 0; color: #64748b; font-size: 12px; text-align: center;">Email ini dikirim secara aman melalui Formulir Kontak Portofolio Anda.</p>
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
		<html lang="id">
		<head>
			<meta charset="utf-8">
			<meta name="viewport" content="width=device-width, initial-scale=1.0">
			<meta name="color-scheme" content="light dark">
			<meta name="supported-color-schemes" content="light dark">
			<style>
				:root { color-scheme: light dark; supported-color-schemes: light dark; }
				body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
				.card { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0; }
				@media (prefers-color-scheme: dark) {
					.bg-main { background-color: #0f172a !important; }
					.card { background-color: #1e293b !important; border-color: #334155 !important; }
					.text-main { color: #f8fafc !important; }
					.text-muted { color: #94a3b8 !important; }
					.box-bg { background-color: #334155 !important; border-color: #475569 !important; }
					.warn-bg { background-color: #451a03 !important; border-left-color: #f59e0b !important; }
					.warn-text { color: #fde68a !important; }
					.footer-bg { background-color: #0f172a !important; border-top-color: #1e293b !important; }
				}
				@media screen and (max-width: 600px) {
					.p-mob { padding: 30px 20px !important; }
					.title-mob { font-size: 20px !important; }
					.otp-mob { font-size: 32px !important; letter-spacing: 6px !important; }
				}
			</style>
		</head>
		<body class="bg-main" style="background-color: #f8fafc; -webkit-font-smoothing: antialiased;">
			<table width="100%%" border="0" cellpadding="0" cellspacing="0" style="padding: 30px 15px;">
				<tr>
					<td align="center">
						<table width="100%%" border="0" cellpadding="0" cellspacing="0" class="card" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0;">
							<tr>
								<td style="background-color: #0ea5e9; padding: 25px 20px; text-align: center;">
									<h2 style="margin: 0; color: #ffffff; font-size: 22px; font-weight: 600;">Portfolio - Sultan Nafis</h2>
								</td>
							</tr>
							<tr>
								<td class="p-mob" style="padding: 40px 30px; text-align: center;">
									<h3 class="text-main title-mob" style="margin: 0 0 15px 0; color: #0f172a; font-size: 20px; text-align: center;">%s</h3>
									<p class="text-muted" style="margin: 0 0 25px 0; color: #475569; font-size: 15px; line-height: 1.6; text-align: center;">
										%s
									</p>
									<center>
										<table border="0" cellpadding="0" cellspacing="0" class="box-bg" style="background-color: #f1f5f9; border: 1px dashed #cbd5e1; border-radius: 8px; margin-bottom: 30px;">
											<tr>
												<td style="padding: 15px 25px;">
													<h1 class="otp-mob" style="margin: 0; color: #0ea5e9; font-size: 38px; font-family: ui-monospace, 'Courier New', monospace; letter-spacing: 8px; font-weight: 700; text-align: center;">%s</h1>
												</td>
											</tr>
										</table>
									</center>
									<table width="100%%" border="0" cellpadding="0" cellspacing="0" class="warn-bg" style="background-color: #fffbeb; border-left: 4px solid #f59e0b; border-radius: 4px;">
										<tr>
											<td style="padding: 15px;">
												<p class="warn-text" style="margin: 0; color: #92400e; font-size: 13px; line-height: 1.5; text-align: left;">
													<strong>Peringatan Keamanan:</strong> Kode ini berlaku selama <strong>5 menit</strong>. Jangan bagikan kode ini kepada siapa pun. Jika Anda tidak meminta kode ini, harap amankan akun Anda.
												</p>
											</td>
										</tr>
									</table>
								</td>
							</tr>
							<tr>
								<td class="footer-bg" style="background-color: #f8fafc; padding: 20px; text-align: center; border-top: 1px solid #e2e8f0;">
									<p class="text-muted" style="margin: 0; color: #64748b; font-size: 12px; text-align: center;">Ini adalah pesan otomatis. Mohon tidak membalas email ini secara langsung.</p>
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
