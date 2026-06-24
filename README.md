# Sultan Nafis Portfolio

A modern, full-stack portfolio website designed to elegantly showcase personal profile, skills, projects, work experiences, and certificates. It features a fully dynamic custom admin dashboard to manage content seamlessly, with robust security and real-time visitor tracking capabilities.

![Next.js](https://img.shields.io/badge/Next.js-black?style=for-the-badge&logo=next.js&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![Go](https://img.shields.io/badge/Go-00ADD8?style=for-the-badge&logo=go&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)
![Vercel](https://img.shields.io/badge/Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white)
![Railway](https://img.shields.io/badge/Railway-131415?style=for-the-badge&logo=railway&logoColor=white)

## ✨ Preview / Demo

* **Live Demo**: [https://portofolio-sultan-nafis.vercel.app/](https://portofolio-sultan-nafis.vercel.app/)
* **Backend API**: `https://<your-backend-railway-url>.railway.app/`
* **Repository**: [https://github.com/sultannafis/portofolio](https://github.com/sultannafis/portofolio)

## 🚀 Features

### Public Features
* Responsive Public Portfolio Page
* Interactive About, Skills, Projects, Experiences, and Certificates sections
* Detailed Project view pages
* Contact Form with email notifications
* Dark / Light mode support
* Multi-language toggle (Indonesia / English)

### Admin Features
* Secure Admin Dashboard & Login
* Full CRUD for Projects, Skills, Certificates, and Experiences
* Admin Messages viewer (from Contact Form)
* Dynamic Admin Settings
* Cloudinary media upload integration
* Real-time WebSocket online status and visitor tracking

### Security Features
* Robust JWT Admin Authentication
* Redis-based Rate Limiting (Upstash)
* Cloudflare Turnstile protection against spam
* Login OTP 2FA mechanism
* Admin security settings toggle with OTP confirmation
* Unique Visitor Hash protection
* Admin visits exclusion from tracking

## 🛠 Tech Stack

| Domain | Technologies |
| :--- | :--- |
| **Frontend** | Next.js, React, TypeScript, Tailwind CSS, Zustand, Framer Motion |
| **Backend** | Go, Go Fiber framework, WebSocket (Fiber Contrib) |
| **Database** | PostgreSQL (Neon), GORM |
| **Services** | Cloudinary (Storage), Resend (Email), Cloudflare Turnstile (Captcha), Upstash Redis (Rate Limiting) |
| **Deployment** | Vercel (Frontend), Railway (Backend) |

## 📁 Project Structure

```text
portfolio/
├── frontend/  # Next.js application, React components, and Tailwind styles
├── backend/   # Go server, Fiber routes, controllers, and GORM models
├── docs/      # Project documentation 
└── README.md  # You are here
```

* **Frontend**: Handles the user interface, public portfolio presentation, admin UI, and routing. 
* **Backend**: Provides the RESTful API and WebSocket connections for data management, authentication, and external service integrations.

## ⚙️ Environment Variables

To run this project, you will need to add the following environment variables to your `.env` or `.env.local` files respectively.

> 🔴 **WARNING: Never commit your `.env` or `.env.local` files.**

**Frontend** (`frontend/.env.local`):
```env
NEXT_PUBLIC_API_URL=
NEXT_PUBLIC_WS_URL=
NEXT_PUBLIC_TURNSTILE_SITE_KEY=
NEXT_PUBLIC_SITE_URL=
```

**Backend** (`backend/.env`):
```env
PORT=
APP_ENV=
DATABASE_URL=
JWT_SECRET=
JWT_EXPIRY=
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
CLOUDINARY_URL=
FRONTEND_URL=
ALLOWED_ORIGINS=
TURNSTILE_SECRET_KEY=
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
RESEND_API_KEY=
CONTACT_TO_EMAIL=
CONTACT_FROM_EMAIL=
VISITOR_HASH_SECRET=
SECURITY_TURNSTILE_ENABLED=
SECURITY_RATE_LIMIT_ENABLED=
SECURITY_VISITOR_PROTECTION_ENABLED=
SECURITY_RESEND_EMAIL_ENABLED=
SECURITY_LOGIN_OTP_ENABLED=
SECURITY_EXCLUDE_ADMIN_VISITS_ENABLED=
```

## 💻 Installation

Clone the repository to your local machine:

```bash
git clone https://github.com/sultannafis/portofolio.git
cd portofolio
```

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

### Backend Setup

```bash
cd backend
go mod tidy
go run cmd/main.go
```

## 🏗 Build

To prepare the application for production:

**Frontend**:
```bash
cd frontend
npm run build
```

**Backend**:
```bash
cd backend
go build -o app cmd/main.go
```

## 🌐 Deployment

* **Frontend**: Deploy directly to **Vercel** with the root directory set to `frontend`.
* **Backend**: Deploy to **Railway** with the root directory set to `backend`.
* Ensure that the environment variables for both the frontend and backend are respectively configured in Vercel and Railway dashboards.
* **Important**: The backend `ALLOWED_ORIGINS` environment variable must include the frontend domain (Vercel URL) to prevent CORS errors.

## 🛡 Security Notes

This application incorporates strong security controls:
* **Authentication**: Secures admin endpoints using robust JWT generation and validation routines.
* **OTP Email 2FA**: Adds an extra authentication layer for login and settings configuration using email verification.
* **Bot Protection**: Prevents form spam and automated abuse using Cloudflare Turnstile CAPTCHA.
* **Rate Limits**: Upstash Redis controls repetitive requests to safeguard against DDoS or brute-force behavior.
* **Visitor Protection**: Securely hashes visitor details to protect anonymity while tracking distinct views.
* **Toggle Controls**: Various security functions are independently toggleable via the admin settings for flexible environment testing.

## 📸 Screenshots

<!-- Add homepage/admin dashboard screenshots here -->

## 👤 Author

**Made with passion by Sultan Nafis**

* **Portfolio**: [https://portofolio-sultan-nafis.vercel.app/](https://portofolio-sultan-nafis.vercel.app/)
* **GitHub**: [https://github.com/sultannafis](https://github.com/sultannafis)
* **Instagram**: [https://www.instagram.com/sultan_nafis01](https://www.instagram.com/sultan_nafis01)
* **TikTok**: [https://www.tiktok.com/@_tan0124_](https://www.tiktok.com/@_tan0124_)

## 📝 License

This project is currently not licensed for public reuse. Please contact the author for permission.
