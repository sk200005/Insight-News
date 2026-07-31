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
