.PHONY: help install dev build start clean docker-up docker-down logs

help:
	@echo "Commandes disponibles :"
	@echo "  make install      - Installer toutes les dépendances"
	@echo "  make dev          - Démarrer en mode développement"
	@echo "  make build        - Builder le projet"
	@echo "  make start        - Démarrer en production"
	@echo "  make clean        - Nettoyer les fichiers générés"
	@echo "  make docker-up    - Démarrer avec Docker Compose"
	@echo "  make docker-down  - Arrêter Docker Compose"
	@echo "  make logs         - Voir les logs Docker"

install:
	cd backend && npm install
	cd web && npm install
	cd mobile && npm install

dev:
	@echo "Démarrage en mode développement..."
	@make -j3 dev-backend dev-web dev-mobile

dev-backend:
	cd backend && npm run dev

dev-web:
	cd web && npm run dev

dev-mobile:
	cd mobile && npm start

build:
	cd backend && npm run build
	cd web && npm run build

start:
	cd backend && npm run start

clean:
	rm -rf backend/dist
	rm -rf web/dist
	rm -rf backend/node_modules
	rm -rf web/node_modules
	rm -rf mobile/node_modules
	rm -rf uploads/*
	rm -rf hls/*
	rm -rf logs/*

docker-up:
	docker-compose up -d

docker-down:
	docker-compose down

docker-build:
	docker-compose build

logs:
	docker-compose logs -f

migrate:
	cd backend && npm run migrate

seed:
	cd backend && npm run seed

test:
	cd backend && npm test
	cd web && npm test

lint:
	cd backend && npm run lint
	cd web && npm run lint
	cd mobile && npm run lint

format:
	cd backend && npm run format
	cd web && npm run format
	cd mobile && npm run format