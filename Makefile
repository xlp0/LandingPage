.PHONY: help start dev build build-mcard test test-smoke test-ui install publish docker-up docker-down

# Default goal when running 'make' without arguments
.DEFAULT_GOAL := help

# Colors for terminal output
GREEN  := $(shell tput -Txterm setaf 2)
YELLOW := $(shell tput -Txterm setaf 3)
RESET  := $(shell tput -Txterm sgr0)

help: ## Show this help message
	@echo ''
	@echo 'Usage:'
	@echo '  $(YELLOW)make$(RESET) $(GREEN)<target>$(RESET)'
	@echo ''
	@echo 'Targets:'
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  $(GREEN)%-18s$(RESET) %s\n", $$1, $$2}' $(MAKEFILE_LIST)
	@echo ''

install: ## Install npm dependencies
	npm install

start: ## Start the central mcard server (ws-server.js)
	npm run ws-server

docker-up: ## Start the server using docker-compose
	docker-compose up -d --build

docker-down: ## Stop the docker-compose server
	docker-compose down

dev: ## Start the Node/WebSocket development server (ws-server.js)
	npm run dev

build: ## Build all workspaces
	npm run build

build-mcard: ## Build the mcard javascript bundle via esbuild
	npm run build:mcard

test: ## Run Playwright tests
	npm run test

test-smoke: ## Run Playwright smoke tests
	npm run test:smoke

test-ui: ## Run Playwright tests with UI
	npm run test:ui

publish: ## Publish all packages to npm
	npm run publish:all
