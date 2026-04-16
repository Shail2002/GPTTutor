#!/bin/bash
# Quick setup script for development

set -e

echo "🚀 FE524 AI Tutor - Development Setup"
echo "======================================"

# Check prerequisites
echo "✓ Checking prerequisites..."

if ! command -v node &> /dev/null; then
    echo "❌ Node.js not found. Install from https://nodejs.org/"
    exit 1
fi

if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 not found. Install from https://python.org/"
    exit 1
fi

echo "✓ Node.js $(node --version)"
echo "✓ Python $(python3 --version)"

# Frontend setup
echo ""
echo "📦 Setting up frontend..."
cd frontend
npm install
echo "✓ Frontend dependencies installed"

cat > .env.local << EOF
NEXT_PUBLIC_API_URL=http://localhost:8000
EOF
echo "✓ Frontend .env created"

# Backend setup
echo ""
echo "🔧 Setting up backend..."
cd ../backend

if [ ! -d "venv" ]; then
    python3 -m venv venv
    echo "✓ Virtual environment created"
fi

source venv/bin/activate
pip install -r requirements.txt
echo "✓ Backend dependencies installed"

cat > ../.env << EOF
OPENAI_API_KEY=sk-your-key-here
DATABASE_URL=postgresql://user:password@localhost:5432/fe524_tutor
DEBUG=True
CHROMA_DB_PATH=./data/.chroma
UPLOAD_DIR=./data/uploads
EOF
echo "✓ Backend .env created - Update OPENAI_API_KEY!"

# Create data directories
mkdir -p data/.chroma data/uploads
echo "✓ Data directories created"

echo ""
echo "✅ Setup complete!"
echo ""
echo "🎯 Next steps:"
echo "  1. Update .env with your OpenAI API key"
echo "  2. Terminal 1: cd frontend && npm run dev"
echo "  3. Terminal 2: cd backend && source venv/bin/activate && python -m uvicorn app.main.server:app --reload"
echo "  4. Open http://localhost:3000"
echo ""
