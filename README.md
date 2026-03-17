<div align="center">

# EduPrep — AI-Powered Placement Preparation Platform

**An intelligent platform to help students ace campus placements through AI mock interviews, proctored online tests, and performance analytics.**

![Node.js](https://img.shields.io/badge/Node.js-339933?style=flat&logo=node.js&logoColor=white)
![React](https://img.shields.io/badge/React-61DAFB?style=flat&logo=react&logoColor=black)
![MongoDB](https://img.shields.io/badge/MongoDB-47A248?style=flat&logo=mongodb&logoColor=white)
![Express](https://img.shields.io/badge/Express.js-000000?style=flat&logo=express&logoColor=white)
![Gemini](https://img.shields.io/badge/Gemini%20LLM-4285F4?style=flat&logo=google&logoColor=white)

</div>

---

## Overview

EduPrep bridges the gap between students and placement readiness. It combines AI-driven mock interviews, a fully proctored test engine, and detailed performance analytics — giving students a realistic, end-to-end placement preparation experience.

---

## Features

### AI Mock Interviews
- Generates role-specific interview questions using **Google Gemini LLM**
- Evaluates responses with structured feedback covering technical accuracy, communication, and confidence
- Resume-aware questioning — upload a PDF resume and get questions tailored to your skills, projects, and experience

### Proctored Online Tests
- Teachers create and assign tests with custom question banks
- Full-screen enforcement with tab-switch detection
- Real-time **AI proctoring** powered by MediaPipe FaceMesh and TensorFlow COCO-SSD:
  - No face detected
  - Multiple faces in frame
  - Looking away from screen
  - Mobile phone / book detected
  - Audio / noise detected
  - Tab switching

### Violation Snapshot System
- Instantly captures a webcam snapshot at the moment of each violation
- Snapshots saved to the database in real time — even if the student closes the tab
- Teachers and admins can review snapshots per student with violation type labels and timestamps
- Fullscreen lightbox view for detailed inspection

### Performance Analytics
- Per-test leaderboard with scores, pass/fail status, time taken, and tab switch counts
- Mock interview analytics: technical score, communication score, confidence level, and improvement suggestions
- Teacher and admin dashboards with paginated result tables and aggregate stats

### Role-Based System
| Role | Capabilities |
|---|---|
| **Student** | Take tests, attempt mock interviews, view personal results |
| **Teacher** | Create tests, view student submissions, inspect violation snapshots |
| **Admin** | Full platform oversight — manage teachers, view all results and snapshots |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React.js, Bootstrap, Vite |
| Backend | Node.js, Express.js |
| Database | MongoDB (Mongoose) |
| AI / LLM | Google Gemini API |
| Computer Vision | MediaPipe FaceMesh, TensorFlow.js COCO-SSD |
| Auth | JWT-based authentication |

---

## Project Structure

```
AI/
├── backend/
│   ├── controllers/       # Auth, test, interview logic
│   ├── models/            # Mongoose schemas
│   ├── routes/            # API endpoints
│   ├── services/          # Gemini AI, email service
│   └── index.js
└── frontend/
    └── src/
        └── components/    # React components
```

---

## Getting Started

### Prerequisites
- Node.js v18+
- MongoDB (local or Atlas)
- Google Gemini API key

### Backend
```bash
cd backend
npm install
# Create a .env file with MONGO_URI, JWT_SECRET, GEMINI_API_KEY
node index.js
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

---

## Purpose

Developed as a **Final Year Engineering Project** to build a scalable, AI-integrated platform that helps students prepare for campus placements through realistic mock interviews, secure online assessments, and data-driven performance tracking.
