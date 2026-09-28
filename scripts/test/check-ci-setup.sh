#!/bin/bash

# Quick CI/CD Setup & Test Script

echo "🚀 Agentic Personal Assistant - CI/CD Local Testing"
echo "=================================================="
echo ""

# Check prerequisites
echo "📋 Checking prerequisites..."

if ! command -v docker &> /dev/null; then
  echo "❌ Docker is not installed"
  echo "   Install from: https://www.docker.com/products/docker-desktop"
  exit 1
fi
echo "✅ Docker found: $(docker --version)"

if ! command -v docker-compose &> /dev/null; then
  echo "❌ Docker Compose is not installed"
  exit 1
fi
echo "✅ Docker Compose found: $(docker-compose --version)"

if ! command -v node &> /dev/null; then
  echo "❌ Node.js is not installed"
  exit 1
fi
echo "✅ Node.js found: $(node --version)"

if ! command -v npm &> /dev/null; then
  echo "❌ npm is not installed"
  exit 1
fi
echo "✅ npm found: $(npm --version)"

echo ""
echo "🔧 Setup complete! All prerequisites met."
echo ""
echo "📖 To run the full CI/CD pipeline locally:"
echo ""
echo "   ./scripts/test/run-ci-local.sh"
echo ""
echo "📖 For more information:"
echo ""
echo "   cat CI_LOCAL_TESTING.md"
echo ""
echo "🎯 Quick Test Commands:"
echo ""
echo "   npm test                  # Run all unit tests"
echo "   npm run test:server       # Run server tests only"
echo "   npm run test:client       # Run client tests only"
echo "   npm run lint              # Check code quality"
echo ""
