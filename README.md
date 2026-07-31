# Insight News


🚀 **[View Live Demo]([https://your-deployed-app-link.com](https://insight-news-eight.vercel.app/))**
Insight News is an AI-powered news aggregation, summarization, and political bias analysis platform designed to process articles via RSS feeds, scrape full-text content, generate concise summaries, and analyze editorial stance and narrative bias using Large Language Models (LLMs) such as Google Gemini and Groq. 

The system features a Node.js/Express REST API backend with automated background sync workflows and Python-based AI evaluation pipelines, complemented by a modern, responsive React (Vite) dynamic web dashboard.

---

## Features

- **Automated RSS Ingestion:** Scheduled feed collection using GitHub Actions and background crons to ingest articles continuously.
- **Web Scraping & Normalization:** Extracts full article text, metadata, and images from source websites and normalizes article content for unified storage.
- **AI-Powered Summarization:** Processes full article text to generate quick, accurate summaries using Gemini / Groq LLMs.
- **Political Bias & Narrative Analysis:** Evaluates political leaning, tone, and narrative bias against established source baselines.
- **PDF Upload & OCR Analysis:** Upload news PDFs to scrape text, extract thumbnail previews, tag source origin, and run pipeline evaluation.
- **Interactive News Dashboard:** Responsive React UI featuring category filtering, bias indicator tags, PDF uploads, analytical charts, and source comparison views.

---

## Project Structure

```text
backend/
  ├── scripts/                  # Scripts for category normalization & data evaluation
  ├── src/
  │   ├── Ai_pipeline/          # Python pipeline scripts & AI requirements
  │   │   ├── bias_pipeline.py  # Python bias analysis execution
  │   │   └── requirements.txt  # Dependencies for Python scripts
  │   ├── config/               # Database and RSS feed source configurations
  │   ├── controllers/          # API route controllers (Articles, Bias, RSS, Scraper, Upload)
  │   ├── models/               # MongoDB Mongoose schema models (Article.js)
  │   ├── routes/               # Express API route endpoints
  │   ├── scripts/              # Evaluation and batch utility scripts
  │   ├── services/             # Core business logic (Gemini/Groq bias services, RSS ingestion, PDF extract)
  │   ├── utils/                # Text sanitizers, summary formatters, and evaluators
  │   └── app.js                # Express app setup and middleware configuration
  ├── uploads/                  # Temporary file upload storage and PDF thumbnails
  ├── package.json              # Backend Node.js dependencies and scripts
  └── server.js                 # Backend server entry point

frontend/
  ├── public/                   # Static assets, logos, and UI screenshot previews
  ├── src/                      # React source components, pages, styles, and state
  ├── package.json              # Frontend dependencies and Vite scripts
  ├── vite.config.js            # Vite build and development configuration
  ├── eslint.config.js          # ESLint code quality configuration
  └── index.html                # Entry HTML document
```
## 🚀 Getting Started

Follow these steps to set up the project locally.

---

## 📋 Prerequisites

### Backend
- Node.js **18+**
- Python **3.9+**
- MongoDB (Local or MongoDB Atlas)

### Frontend
- Node.js **18+**
- npm

---

## ⚙️ Backend Setup

### 1. Install Node.js dependencies

```bash
cd backend
npm install
```

### 2. Install Python AI Pipeline dependencies

```bash
cd src/Ai_pipeline
pip install -r requirements.txt
cd ../..
```

### 3. Configure Environment Variables

Create a `.env` file inside the `backend` directory.

```env
PORT=5000
MONGO_URI=your_mongodb_connection_string
GEMINI_API_KEY=your_gemini_api_key
GROQ_API_KEY=your_groq_api_key
```

### 4. Start the Backend Server

```bash
npm start
```

### Development Mode

```bash
npm run dev
```

---

## 🎨 Frontend Setup

### 1. Install Dependencies

```bash
cd frontend
npm install
```

### 2. Start Development Server

```bash
npm run dev
```

### 3. Build for Production

```bash
npm run build
```

---

## 💻 Usage

After both servers are running:

- **Frontend:** http://localhost:5173
- **Backend API:** http://localhost:5000

### Features

- 📰 Aggregates news from multiple RSS feeds
- 🤖 AI-powered news summarization
- ⚖️ Political bias analysis
- 📄 PDF news document processing
- 🔍 Intelligent news search and filtering

---

## 📄 License

This project is intended for **academic and demonstration purposes**.

---

## 🙌 Acknowledgements

- React
- Vite
- Express.js
- MongoDB
- Google Gemini API
- Groq API
