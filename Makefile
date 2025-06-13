# Makefile for Club Green SvelteKit Development
# Enables agentic development workflow with proper logging and debugging

.PHONY: help dev build test lint check clean tail-logs setup install

# Default target
help:
	@echo "Available commands:"
	@echo "  make dev         - Start development server with enhanced logging"
	@echo "  make build       - Build the application for production"
	@echo "  make test        - Run all tests"
	@echo "  make lint        - Run linting and type checking"
	@echo "  make check       - Run SvelteKit check"
	@echo "  make clean       - Clean build artifacts"
	@echo "  make tail-logs   - Tail development logs in real-time"
	@echo "  make setup       - Initial project setup"
	@echo "  make install     - Install dependencies"

# Install dependencies
install:
	@echo "📦 Installing dependencies..."
	npm install

# Initial project setup
setup: install
	@echo "🚀 Setting up development environment..."
	@if [ ! -f .env.local ]; then \
		echo "⚠️  Creating .env.local template..."; \
		cp .env.example .env.local 2>/dev/null || echo "# Add your environment variables here" > .env.local; \
	fi
	@echo "🔧 Generating Supabase types..."
	npm run generate-types || echo "⚠️  Supabase types generation skipped (set up Supabase first)"
	@echo "✅ Setup complete! Edit .env.local with your environment variables"

# Development server with enhanced logging
dev:
	@echo "🚀 Starting development server with enhanced logging..."
	@mkdir -p logs
	@echo "📝 Logs will be saved to logs/dev.log"
	@echo "🔍 Use 'make tail-logs' in another terminal to follow logs"
	npm run dev 2>&1 | tee logs/dev.log

# Tail development logs
tail-logs:
	@echo "📊 Tailing development logs..."
	@if [ -f logs/dev.log ]; then \
		tail -f logs/dev.log; \
	else \
		echo "❌ No log file found. Run 'make dev' first."; \
	fi

# Build for production
build:
	@echo "🏗️  Building application..."
	npm run build

# Run tests
test:
	@echo "🧪 Running tests..."
	npm run test

# Linting and type checking
lint:
	@echo "🔍 Running linting..."
	npm run lint
	@echo "🔍 Running type checking..."
	npm run check

# SvelteKit check
check:
	@echo "✅ Running SvelteKit check..."
	npm run check

# Clean build artifacts
clean:
	@echo "🧹 Cleaning build artifacts..."
	rm -rf build
	rm -rf .svelte-kit
	rm -rf logs/*.log
	@echo "✅ Clean complete"

# Development with browser automation ready
dev-with-browser:
	@echo "🚀 Starting development with browser automation support..."
	@mkdir -p logs
	@echo "🌐 Browser automation ready for playwright-mcp"
	DEBUG=* npm run dev 2>&1 | tee logs/dev-browser.log

# Quick dev restart (useful for agentic workflows)
restart:
	@echo "🔄 Restarting development server..."
	@pkill -f "vite" || true
	@sleep 2
	@make dev

# Show recent errors from logs
show-errors:
	@echo "🚨 Recent errors from development logs:"
	@if [ -f logs/dev.log ]; then \
		grep -i "error\|fail\|exception" logs/dev.log | tail -10; \
	else \
		echo "❌ No log file found."; \
	fi

# Database operations
db-reset:
	@echo "🗄️  Resetting local database..."
	supabase db reset

db-migrate:
	@echo "🗄️  Running database migrations..."
	supabase db push

# Generate fresh types
types:
	@echo "🔧 Generating fresh TypeScript types..."
	npm run generate-types