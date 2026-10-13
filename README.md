# FasilLink

A full-stack marketplace platform for buying, selling, and renting properties, vehicles, and event items.

**Live demo:** https://fasillink-app.vercel.app
**Code:** this repository

> The backend runs on a free server that sleeps when idle, so the **first load can take up to a minute**. After that it is fast.

**Demo accounts** (test accounts with fake data)

| Role | Email | Password |
|------|-------|----------|
| Customer | `[demo customer email]` | `[demo password]` |
| Owner | `[demo owner email]` | `[demo password]` |

**Deployed on:** Vercel (customer site and admin dashboard), Render (backend API), Neon (PostgreSQL)

FasilLink was developed as a practical marketplace application that brings listings, search, user accounts, payments, communication, administration, and AI-based recommendations into one platform.

## Screenshots

### Marketplace

| Homepage | Register | Login |
|----------|----------|-------|
| ![Homepage](images/photo_2026-09-02_19-46-59.jpg) | ![Register](images/photo_2026-09-02_19-46-46.jpg) | ![Login](images/photo_2026-09-02_19-46-43.jpg) |

### Listings and Communication

| Listing Details | Real-Time Chat |
|-----------------|----------------|
| ![Listing Details](images/photo_2026-09-02_19-47-18.jpg) | ![Real-Time Chat](images/photo_2026-09-02_19-47-28.jpg) |

### AI and Administration

| AI Recommendations | Admin Dashboard |
|--------------------|-----------------|
| ![AI Recommendations](images/photo_2026-09-02_19-47-22.jpg) | ![Admin Dashboard](images/photo_2026-09-02_19-47-41.jpg) |

## Overview

FasilLink is a marketplace application where users can find and publish listings for properties, vehicles, and event-related items.

Users can create accounts, browse listings, search and filter available items, save favorites, contact other users, pay online, and communicate through the platform.

The system also includes an administration dashboard and a separate AI service for recommendation features.

## Main Features

### Marketplace
- Browse available listings: properties, vehicles, and event items
- Buying and rental listings
- Detailed listing pages with image uploads
- Manage personal listings
- Recently added, similar, and recommended listings
- Online payments with Chapa (test mode)

### Search and Filtering
- Search marketplace listings
- Browse by category
- Filter by price and other options
- Sort search results

### User Accounts
- Registration with email verification
- Login with JWT authentication
- Password reset by email
- User profiles
- Favorites and ratings
- Notifications
- Contact sellers and renters

### Real-Time Chat
FasilLink includes real-time communication between users using Socket.IO. Messages are shown immediately in the sender's chat (optimistic updates) and confirmed by the server with an acknowledgment, so the chat stays fast and does not duplicate messages.

### Admin Dashboard
A separate administration dashboard for managing the platform, including:
- Users
- Listings
- Categories
- Announcements and reports
- Marketplace activity

### AI Recommendations
FasilLink includes a separate Python-based AI service. It analyzes listing information to help provide relevant recommendations, using text processing, sentence-transformer embeddings, and similarity-based techniques.

> The AI service currently runs locally and is not part of the live demo yet.

## System Architecture

```
                    FasilLink
                        |
        +---------------+---------------+
        |               |               |
        v               v               v
    Frontend        Backend API      AI Service
    React + TS      Node.js          Python/Flask
    (CRA)           Express               |
        |               |                 |
        |               v                 |
        |          PostgreSQL             |
        |                                 |
        +---------------+-----------------+
                        |
                  Recommendations
```

The React frontend communicates with the Node.js backend through a REST API and Socket.IO. The backend manages authentication, listings, users, payments, email, database operations, and chat. The AI service runs separately and provides recommendation functionality to the backend.

## Technology Stack

### Frontend (customer site)
- React (Create React App) and TypeScript
- React Router
- Tailwind CSS
- Axios
- Framer Motion
- Lucide React
- Socket.IO Client

### Admin Dashboard
- React and Vite

### Backend
- Node.js and Express.js
- PostgreSQL
- Socket.IO
- JWT and bcrypt
- Multer and Cloudinary (image uploads)
- Chapa (payments)
- Brevo transactional email API (Nodemailer SMTP as fallback)
- dotenv

### AI Service
- Python and Flask
- NumPy, Pandas, Scikit-learn
- Sentence Transformers

### Hosting and Tools
- Vercel, Render, Neon
- Git, GitHub, npm, VS Code

## Project Structure

```
FasilLink/
└── final project_fasilink/
    ├── frontend/          React customer site
    ├── backend/           Express API, Socket.IO, schema.sql
    ├── ai-service/        Flask recommendation service
    ├── admin-dashboard/   Vite admin dashboard
    └── docs/              Documentation
```

## Application Flow

```
User
 |
 v
Register / Login
 |
 v
Marketplace
 |
 +-------------------+
 |                   |
 v                   v
Search & Filter    Browse Categories
 |                   |
 +---------+---------+
           |
           v
      View Listing
           |
     +-----+-----+
     |           |
     v           v
 Favorite      Contact
                 |
                 v
                Chat
                 |
                 v
        AI Recommendations
```

## Recommendation Flow

```
User Information
       |
       v
User Preferences
       |
       v
Listing Information
       |
       v
Text Processing
       |
       v
Embeddings
       |
       v
Similarity Analysis
       |
       v
Recommendation Ranking
       |
       v
Recommended Listings
```

The recommendation system is separated from the main backend so that AI-related functionality can be developed and improved independently.

## Authentication and Security

- JWT authentication
- Password hashing with bcrypt
- Email verification and password reset links (Brevo)
- Protected routes
- CORS restricted to the deployed frontend and admin URLs
- Environment variables for all secrets
- Request validation and rate limiting

Sensitive values such as passwords, API keys, and database credentials are stored in environment variables and are never committed to GitHub.

## Database

FasilLink uses PostgreSQL (hosted on Neon in production) to store users, listings, categories, favorites, ratings, messages, notifications, payments, and recommendation-related data.

Create the tables with `backend/schema.sql`.

## Getting Started

### Prerequisites
- Node.js and npm
- Python 3
- PostgreSQL
- Git

### 1. Clone the repository

```bash
git clone https://github.com/hilinaasres/FasilLink.git
cd FasilLink/"final project_fasilink"
```

### 2. Set up the database

Create a PostgreSQL database and run `backend/schema.sql` on it.

### 3. Start the backend

```bash
cd backend
npm install
npm run dev      # development (nodemon)
# or: npm start
```

The backend runs on `http://localhost:5000` by default.

### 4. Start the frontend

Open another terminal:

```bash
cd frontend
npm install
npm start
```

The frontend runs on `http://localhost:3000`.

### 5. Start the admin dashboard (optional)

```bash
cd admin-dashboard
npm install
npm run dev
```

### 6. Start the AI service (optional)

```bash
cd ai-service
python -m venv .venv
.venv\Scripts\activate          # Windows
# source .venv/bin/activate     # Linux / macOS
pip install -r requirements.txt
```

Then start the Flask app with the service's Python entry point. It runs separately from the Node.js backend (default `http://localhost:5001`).

## Environment Variables

Create a `.env` file in `backend/`. Example with placeholder values only:

```env
PORT=5000
DATABASE_URL=postgresql://user:password@host/dbname?sslmode=require
JWT_SECRET=change-me
FRONTEND_URL=http://localhost:3000
ADMIN_URL=http://localhost:5173
BACKEND_URL=http://localhost:5000
AI_SERVICE_URL=http://localhost:5001
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
CHAPA_SECRET_KEY=
BREVO_API_KEY=
BREVO_SENDER_EMAIL=
BREVO_SENDER_NAME=FasilLink
```

For the frontend, create `frontend/.env`:

```env
REACT_APP_API_BASE_URL=http://localhost:5000/api
```

For the admin dashboard, create `admin-dashboard/.env`:

```env
VITE_API_BASE_URL=http://localhost:5000/api
```

Do not commit real credentials or secret keys to the repository.

## Production Deployment

The live version is split across free hosting services:

```
Browser
   |
   +--> Vercel: customer site (React) and admin dashboard (Vite)
   |
   +--> Render: Node.js / Express API + Socket.IO
              |
              +--> Neon: PostgreSQL
              +--> Cloudinary: images
              +--> Brevo: transactional email
```

The AI recommendation service runs locally and is not part of the live demo yet. Self-hosting with Nginx, PM2, and systemd is described in the deployment documentation in `docs/`.

## What I Learned

This project gave me practical experience with:

- Full-stack web development with React, TypeScript, Node.js, and Express
- PostgreSQL database design
- REST API development, authentication, and authorization
- Real-time communication with Socket.IO, including optimistic UI updates and acknowledgments
- File and image uploads with cloud storage
- Machine learning and recommendation systems with sentence embeddings
- Building separate backend services
- Deploying a full-stack app to Vercel, Render, and Neon
- Debugging production issues: CORS, API response caching, and blocked SMTP ports
- Replacing SMTP with a transactional email API
- Git and GitHub

## Future Improvements

- Deploy the AI recommendation service
- More advanced and personalized recommendation models
- Mobile application
- More payment integrations
- Better analytics
- Automated testing
- CI/CD
- Improved notification features

## Author

**Hilina Asres Mulugeta**
Computer Science, University of Gondar, Ethiopia

GitHub: [@hilinaasres](https://github.com/hilinaasres)

## License

This project was developed as an academic and portfolio project.
