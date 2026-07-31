# Insight News

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

---
  Getting Started
Prerequisites
Backend: Node.js 18+, Python 3.9+, MongoDB instance (Local or Atlas)

Frontend: Node.js 18+, npm
---
Backend Setup
Navigate to the backend directory and install Node.js dependencies:

Bash
cd backend
npm install
Install Python dependencies for the AI pipeline:

Bash
cd src/Ai_pipeline
pip install -r requirements.txt
cd ../..
Configure Environment Variables:
Create a .env file in the backend/ directory with the following variables:

Code snippet
PORT=5000
MONGO_URI=your_mongodb_connection_string
GEMINI_API_KEY=your_gemini_api_key
GROQ_API_KEY=your_groq_api_key
Start the Express server:

Bash
npm start
(Or run in development mode with nodemon)

Bash
npm run dev
Frontend Setup
Navigate to the frontend directory and install dependencies:

Bash
cd frontend
npm install
Start the Vite development server:

Bash
npm run dev
Build for production:

Bash
npm run build
Usage
Access the frontend dashboard at http://localhost:5173 (default Vite development port).
---
The frontend communicates with the backend Express API running at http://localhost:5000.

Browse aggregated RSS news stories, view automatically generated summaries, upload PDF news articles for extraction, and inspect political bias scores across different news outlets.
