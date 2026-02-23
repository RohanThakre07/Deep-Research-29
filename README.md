[README.md](https://github.com/user-attachments/files/25498035/README.md)
[README.md](https://github.com/user-attachments/files/25496159/README.md)
# PrintifyAuto - Standalone Deployment Guide

A fully automated application that creates Printify product drafts from uploaded design images. Runs entirely on GitHub + Render with zero external dependencies.

## Architecture Overview

```
printify-auto/
├── src/
│   ├── server/           # Express.js backend
│   │   ├── index.ts      # Main server entry
│   │   ├── db/           # SQLite database
│   │   ├── services/     # Business logic
│   │   │   ├── printify.ts
│   │   │   ├── imageAnalysis.ts
│   │   │   └── folderWatcher.ts
│   │   └── routes/       # API routes
│   ├── client/           # React frontend
│   │   ├── components/
│   │   ├── pages/
│   │   └── main.tsx
│   └── shared/           # Shared types
├── uploads/              # Monitored folder for images
├── processed/            # Processed images moved here
├── data/                 # SQLite database file
├── render.yaml           # Render deployment config
├── package.json
└── .env.example
```

## Tech Stack

- **Backend**: Express.js + TypeScript
- **Frontend**: React + Vite + Tailwind CSS
- **Database**: SQLite (file-based, persists on Render disk)
- **File Monitoring**: Chokidar
- **AI Analysis**: OpenAI GPT-4 Vision (free tier compatible)
- **Deployment**: Render Web Service

## Setup Instructions

### 1. Clone and Install

```bash
git clone https://github.com/yourusername/printify-auto.git
cd printify-auto
npm install
```

### 2. Environment Variables

Create a `.env` file:

```env
PORT=3001
NODE_ENV=development

# Printify API
PRINTIFY_API_KEY=your_printify_api_key
PRINTIFY_SHOP_ID=your_shop_id

# OpenAI for image analysis
OPENAI_API_KEY=your_openai_api_key

# Product template settings
DEFAULT_BLUEPRINT_ID=145
DEFAULT_PRINT_PROVIDER_ID=99
DEFAULT_VARIANT_IDS=["1234","5678"]
DEFAULT_PRICE=1999
```

### 3. Get Your API Keys

**Printify API Key:**
1. Go to https://printify.com/app/account/api
2. Generate a new API token
3. Copy it to `PRINTIFY_API_KEY`

**Printify Shop ID:**
1. Go to your Printify dashboard
2. The shop ID is in the URL: `printify.com/app/store/SHOP_ID/...`
3. Or call `GET https://api.printify.com/v1/shops.json` with your API key

**OpenAI API Key:**
1. Go to https://platform.openai.com/api-keys
2. Create a new key
3. Copy it to `OPENAI_API_KEY`

### 4. Initialize Database

```bash
npm run db:init
```

### 5. Run Locally

```bash
npm run dev
```

- Frontend: http://localhost:5173
- Backend: http://localhost:3001

## Deployment to Render

### 1. Push to GitHub

```bash
git add .
git commit -m "Initial commit"
git push origin main
```

### 2. Create Render Web Service

1. Go to https://render.com
2. Click "New +" → "Web Service"
3. Connect your GitHub repo
4. Configure:
   - **Name**: printify-auto
   - **Runtime**: Node
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - **Instance Type**: Free

### 3. Add Environment Variables

In Render dashboard → Environment:
- `PRINTIFY_API_KEY`
- `PRINTIFY_SHOP_ID`
- `OPENAI_API_KEY`
- `NODE_ENV=production`

### 4. Add Disk (for SQLite persistence)

1. Go to your service → Disks
2. Add disk:
   - **Name**: data
   - **Mount Path**: `/data`
   - **Size**: 1 GB (free tier)

## Usage

### Web Interface
1. Open the app in your browser
2. Go to "Upload" tab
3. Drag and drop images or click to upload
4. Images are automatically analyzed and products created

### Folder Monitoring (Local)
1. Drop PNG/JPG files into the `uploads/` folder
2. The system automatically detects new files
3. Products are created and files moved to `processed/`

### API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/health | Health check |
| GET | /api/products | List all products |
| GET | /api/products/:id | Get product details |
| POST | /api/upload | Upload image for processing |
| POST | /api/analyze | Analyze image with AI |
| POST | /api/create-draft | Create Printify draft |
| GET | /api/logs | View processing logs |
| GET | /api/settings | Get current settings |
| PUT | /api/settings | Update settings |

## How It Works

1. **Image Detection**: Chokidar watches the uploads folder
2. **Image Analysis**: OpenAI Vision analyzes the design
3. **Content Generation**: AI generates title, bullets, description, tags
4. **Printify Upload**: Image uploaded to Printify
5. **Draft Creation**: Product created with template settings
6. **Logging**: All actions logged to database

## Cost Breakdown

| Service | Tier | Cost |
|---------|------|------|
| Render | Free | $0/month |
| GitHub | Free | $0/month |
| OpenAI | Pay-as-you-go | ~$0.01/image |

**Note**: OpenAI charges per image analyzed. At ~$0.01 per image, processing 100 images costs about $1.

## Troubleshooting

**"Cannot connect to Printify"**
- Verify your API key is correct
- Check your shop ID

**"Image analysis failed"**
- Verify OpenAI API key
- Check image file is valid PNG/JPG

**"Database locked"**
- Restart the server
- Check disk space on Render

## License

MIT
