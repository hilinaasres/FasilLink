# FasilLink

A full-stack marketplace platform for buying, selling, and renting properties, vehicles, and event-related items.

FasilLink brings listings, search, communication, administration, and AI-powered recommendations together in one platform.

## Overview

FasilLink is designed as a digital marketplace where users can discover available properties, vehicles, and event materials, publish their own listings, communicate with other users, and receive personalized recommendations.

The project was developed as a practical full-stack application combining modern web development, backend APIs, database management, real-time communication, and machine-learning-based recommendations.

## Key Features

### Marketplace

- Browse marketplace listings
- Property listings
- Vehicle listings
- Event material listings
- Buying and rental support
- Listing details and image galleries
- Recently added items
- Trending items
- Similar item recommendations

### Search and Discovery

- Marketplace search
- Category-based browsing
- Search filtering
- Price-based filtering
- Sorting
- Search result pages
- Personalized recommendations

### User Features

- User registration
- User login
- Authentication
- User profiles
- Favorites
- Notifications
- Listing management
- User-to-user communication
- Real-time chat

### Administration

The platform includes an administration interface for managing the marketplace.

Administrators can manage:

- Users
- Marketplace listings
- Categories
- Platform content
- Reports and marketplace activity

### AI Recommendation System

FasilLink includes a separate AI service for recommendation functionality.

The recommendation system uses listing information and user-related data to identify items that may be relevant to users.

The AI component includes machine-learning and similarity-based techniques, including sentence-transformer embeddings and similarity analysis.

## System Architecture

```text
                    FasilLink
                        |
        +---------------+---------------+
        |               |               |
        v               v               v
   React Frontend   Node.js API    AI Service
   TypeScript       Express.js     Python/Flask
        |               |               |
        |               v               |
        |          PostgreSQL           |
        |                               |
        +-------------------------------+
                        |
                 Recommendations

The main backend acts as the central API layer and communicates with the database and AI service.

Technology Stack
Frontend
React
TypeScript
React Router
Tailwind CSS
Axios
Framer Motion
Lucide React
Socket.IO Client
Backend
Node.js
Express.js
PostgreSQL
Socket.IO
JWT
bcrypt
Multer
Cloudinary
Nodemailer
Axios
dotenv
AI Service
Python
Flask
NumPy
Pandas
Scikit-learn
Sentence Transformers
Machine learning
Recommendation algorithms
Project Structure
FasilLink/
│
└── final project_fasilink/
    │
    ├── frontend/
    │   ├── public/
    │   ├── src/
    │   ├── package.json
    │   └── ...
    │
    ├── backend/
    │   ├── src/
    │   ├── package.json
    │   └── ...
    │
    ├── ai-service/
    │   ├── Python recommendation service
    │   └── ...
    │
    ├── admin-dashboard/
    │   └── ...
    │
    ├── docs/
    │   └── ...
    │
    └── README.md
Main User Flow
Register / Login
       |
       v
Browse Marketplace
       |
       v
Search / Filter
       |
       v
View Listing
       |
       +----------+
       |          |
       v          v
  Add Favorite   Contact Seller
       |          |
       |          v
       |        Chat
       |
       v
AI Recommendations
AI Recommendation Workflow
User Activity
     |
     v
User Preferences
     |
     v
Listing Information
     |
     v
Feature / Text Processing
     |
     v
Embedding & Similarity Analysis
     |
     v
Recommendation Ranking
     |
     v
Recommended Listings

The AI service is separated from the main Node.js backend so that recommendation functionality can be developed and improved independently.

Real-Time Communication

FasilLink uses Socket.IO to support real-time communication between users.

This allows users to communicate through the marketplace without relying only on traditional request-response interactions.

Authentication and Security

The backend includes authentication and security-related components such as:

JWT-based authentication
Password hashing with bcrypt
Request rate limiting
CORS configuration
Environment-based configuration
Input and request handling
Protected user functionality

Sensitive configuration values should be stored in environment variables rather than committed to the repository.

Database

FasilLink uses PostgreSQL as its primary database.

The database stores information related to areas such as:

Users
Listings
Categories
Favorites
Messages
Notifications
Marketplace activity
Recommendation-related data
Getting Started
Prerequisites

Make sure the following are installed:

Node.js
npm
Python 3
PostgreSQL
Git
1. Clone the repository
git clone https://github.com/hilinaasres/FasilLink.git
cd FasilLink

The main project is located inside:

cd "final project_fasilink"
2. Frontend
cd frontend
npm install
npm start

The frontend development server runs on:

http://localhost:3000
3. Backend

Open another terminal:

cd "final project_fasilink/backend"
npm install
npm start

The backend uses port 5000 by default.

4. AI Service

Open another terminal:

cd "final project_fasilink/ai-service"

Create and activate a Python virtual environment:

Windows
python -m venv .venv
.venv\Scripts\activate
Linux / macOS
python3 -m venv .venv
source .venv/bin/activate

Install the required Python packages:

pip install -r requirements.txt

Then start the AI service according to its application entry point.

Environment Variables

Do not commit real credentials or secret keys to GitHub.

Create the required environment files locally.

Example configuration:

PORT=5000
AI_SERVICE_URL=http://localhost:5001
BACKEND_BASE_URL=http://localhost:5000
FRONTEND_BASE_URL=http://localhost:3000

If payment, database, email, cloud-storage, or other external services are configured, their credentials should also be provided through environment variables.

Development Architecture

During development, the services can run separately:

Frontend
http://localhost:3000
        |
        v
Backend API
http://localhost:5000
        |
        +------------------+
        |                  |
        v                  v
   PostgreSQL          AI Service
                       http://localhost:5001

For production deployment, the backend can act as the public entry point while the AI service remains an internal service.

Production Deployment

For production, the application can be deployed using a process manager or service manager.

Possible deployment components include:

Node.js backend
Python AI service
PostgreSQL
PM2
systemd
Nginx
HTTPS/TLS

The original deployment documentation contains additional information about single-port deployment, PM2, systemd, and Nginx configuration.

Documentation

Additional project documentation is available inside the repository, including:

Quick-start instructions
Frontend documentation
API configuration
Build information
Deployment documentation
Database/schema documentation
Future Improvements

Potential future improvements include:

More advanced recommendation models
Improved personalization
Better recommendation ranking
Advanced marketplace analytics
Improved mobile responsiveness
More payment options
Enhanced notification system
Automated testing
CI/CD pipeline
Cloud deployment
Project Goals

FasilLink demonstrates how multiple technologies can be combined to build a practical marketplace application.

The project focuses on:

Full-stack web development
REST API development
Database design
Authentication
Real-time communication
File and image management
Machine learning
Recommendation systems
Software architecture
Deployment
Author

Hilina Asres

Computer Science student and software developer.

License

This project is intended as an academic and portfolio project.
