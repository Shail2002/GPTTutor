#!/bin/bash
# Windows/WSL setup script (PowerShell alternative)

echo "FE524 AI Tutor - Development Setup"

# Frontend setup
echo "Setting up frontend..."
cd frontend
npm install

@"
NEXT_PUBLIC_API_URL=http://localhost:8000
"@ | Out-File -FilePath .env.local -Encoding UTF8

cd ..

# Backend setup
echo "Setting up backend..."
cd backend

if (-not (Test-Path "venv")) {
    python -m venv venv
}

.\venv\Scripts\Activate.ps1

pip install -r requirements.txt

@"
OPENAI_API_KEY=sk-your-key-here
DATABASE_URL=postgresql://user:password@localhost:5432/fe524_tutor
DEBUG=True
"@ | Out-File -FilePath ..\.env -Encoding UTF8

mkdir -Force data\.chroma, data\uploads

echo "Setup complete!"
echo "Next: Update .env file and run frontend/backend"
