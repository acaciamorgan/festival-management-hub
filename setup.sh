#!/bin/bash

echo "Setting up FX Management V2..."

# Fix npm permissions
echo "Fixing npm permissions..."
sudo chown -R $(whoami) ~/.npm

# Install dependencies
echo "Installing dependencies..."
npm install --legacy-peer-deps

# Create environment file
echo "Creating environment file..."
if [ ! -f .env ]; then
  cp .env.example .env
  echo "Created .env file - please update with your Supabase credentials"
fi

echo "Setup complete! Run 'npm run dev' to start the development server."