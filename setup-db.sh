#!/bin/bash

# Database Setup Script
# This script sets up the PostgreSQL database for the Order Execution Engine
# Usage: ./setup-db.sh

set -e  # Exit on error

echo "🚀 Setting up Order Execution Engine Database..."
echo ""

# Check if .env file exists
if [ ! -f .env ]; then
    echo "⚠️  .env file not found. Creating from env.example..."
    cp env.example .env
    echo "✅ Created .env file. Please edit it with your database credentials."
    echo ""
fi

# Load environment variables
export $(cat .env | grep -v '^#' | xargs)

# Check if PostgreSQL is running
echo "Checking PostgreSQL connection..."
if ! psql -h "${DB_HOST:-localhost}" -p "${DB_PORT:-5432}" -U "${DB_USER:-postgres}" -d postgres -c '\q' 2>/dev/null; then
    echo "❌ Cannot connect to PostgreSQL!"
    echo "   Please ensure PostgreSQL is running and credentials in .env are correct."
    exit 1
fi

echo "✅ PostgreSQL connection successful"
echo ""

# Run the setup script
echo "Running database setup..."
npm run setup:db

echo ""
echo "✅ Database setup complete!"
echo ""
echo "Next steps:"
echo "  1. Start the server: npm start"
echo "  2. Or run in dev mode: npm run dev"
echo "  3. Seed sample data (optional): npm run seed"

