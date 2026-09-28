# 🚀 Documentation Technique - Setup & Déploiement

## 1. Prérequis

### Système

```bash
# Vérifier les prérequis
Node.js:  v18+ (vérifier: node --version)
npm:      v9+ (vérifier: npm --version)
Docker:   20.10+ (vérifier: docker --version)
Git:      2.30+ (vérifier: git --version)
```

### Installation des outils

**macOS**:
```bash
# Installer Homebrew (si nécessaire)
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Installer dépendances
brew install node docker git
```

**Ubuntu/Debian**:
```bash
sudo apt-get update
sudo apt-get install -y nodejs npm docker.io git
```

**Windows**:
- Télécharger: Node.js (https://nodejs.org/)
- Télécharger: Docker Desktop (https://www.docker.com/products/docker-desktop)
- Télécharger: Git (https://git-scm.com/)

---

## 2. Installation Locale (Développement)

### Step 1: Cloner le Repository

```bash
git clone https://github.com/tariqlabs/agentic-personal-assistant.git
cd agentic-personal-assistant
```

### Step 2: Vérifier l'Installation

```bash
./scripts/test/check-ci-setup.sh
# Output:
# ✓ Docker is installed
# ✓ Node.js is installed
# ✓ npm is installed
```

### Step 3: Configuration d'Environnement

```bash
# Créer .env au root
cat > .env << EOF
# API Configuration
API_KEY=test-key-development
NODE_ENV=development
PORT=3001

# CORS Configuration  
CORS_ORIGIN=http://localhost:5173,http://localhost:5174,http://localhost:3001

# Ollama Configuration
OLLAMA_HOST=http://localhost:11434
OLLAMA_MODEL_DEFAULT=qwen2:7b

# Vector Store Configuration
USE_CHROMA=true
CHROMA_URL=http://localhost:8000

# Pinecone (optionnel)
# USE_PINECONE=false
# PINECONE_API_KEY=your-key-here
# PINECONE_ENVIRONMENT=us-west1
EOF
```

### Step 4: Démarrer les Containers

```bash
# Démarrer Ollama + Chroma
docker-compose -f docker-compose.dev.yml up -d

# Vérifier les services
docker ps
# CONTAINER ID   IMAGE           PORTS
# xxx            ollama          0.0.0.0:11434->11434/tcp
# yyy            chroma          0.0.0.0:8000->8000/tcp
```

### Step 5: Installer les Dépendances

```bash
# Root dependencies
npm install

# Server dependencies
cd server && npm install && cd ..

# Client dependencies  
cd client && npm install && cd ..
```

### Step 6: Initialiser la Base de Données

```bash
# SQLite sera créée automatiquement au démarrage du server
# Vérifier:
cd server
npm run dev &
# Output: "Database initialized with 3 tables"
```

### Step 7: Démarrer l'Application

**Option A: Deux terminals (développement parallèle)**

Terminal 1 - Backend:
```bash
cd server
npm run dev
# Output: listening on http://localhost:3001
```

Terminal 2 - Frontend:
```bash
cd client
npm run dev
# Output: http://localhost:5173/
```

**Option B: Un terminal (npm concurrently)**

```bash
npm run dev:full
# Starts both backend and frontend
```

### Step 8: Accéder l'Application

- **Frontend**: http://localhost:5173
- **Backend**: http://localhost:3001
- **Ollama**: http://localhost:11434
- **Chroma**: http://localhost:8000

---

## 3. Installation des Modèles Ollama

### Automatisée

```bash
npm run install:models:default

# Installe: qwen2:7b mistral:7b neural-chat:7b nomic-embed-text
```

### Manuelle

```bash
# Via Ollama CLI (si installé localement)
ollama pull qwen2:7b
ollama pull mistral:7b

# Vérifier les modèles installés
curl http://localhost:11434/api/tags
```

---

## 4. Tests

### Unit Tests

```bash
# All tests
npm test

# Only server
npm run test:server

# Only client
npm run test:client

# Watch mode
npm run test:watch

# Coverage report
npm run test:coverage
```

### E2E Tests

```bash
# Playwright E2E
npm run test:e2e

# Playwright UI
npm run test:e2e:ui
```

### Local CI (Simule GitHub Actions)

```bash
./scripts/test/run-ci-local.sh
# Runs complete CI pipeline locally
```

---

## 5. Déploiement Production

### Option A: Docker Compose

```bash
# Build images
docker-compose build

# Start services
docker-compose up -d

# Monitor logs
docker-compose logs -f

# Stop services
docker-compose down
```

**Configuration Production** (.env):
```bash
API_KEY=<generate-strong-key>
NODE_ENV=production
CORS_ORIGIN=https://yourdomain.com

# Use cloud Pinecone instead of local Chroma
USE_PINECONE=true
PINECONE_API_KEY=<your-key>
PINECONE_ENVIRONMENT=us-west1
```

### Option B: Kubernetes

```bash
# Create namespace
kubectl create namespace agentic

# Deploy backend
kubectl apply -f k8s/backend.yaml -n agentic

# Deploy frontend
kubectl apply -f k8s/frontend.yaml -n agentic

# Expose service
kubectl port-forward service/api 3001:3001 -n agentic
```

### Option C: Cloud Platforms

#### Vercel (Frontend)

```bash
# Deploy React app
vercel deploy --prod

# Set environment variables
vercel env add API_URL https://api.yourdomain.com
```

#### Railway/Render (Backend)

```bash
# Connect Git repository
# Railway/Render detects Dockerfile

# Set environment variables in dashboard
API_KEY=<strong-key>
PINECONE_API_KEY=<key>
```

#### AWS EC2 (Full Stack)

```bash
# SSH to instance
ssh -i key.pem ec2-user@<ip>

# Clone and setup
git clone <repo>
cd agentic-personal-assistant
cp .env.production .env

# Docker Compose
docker-compose up -d

# Check health
curl http://localhost:3001/healthz
```

---

## 6. Variables d'Environnement

### Backend (.env)

```bash
# API
API_KEY=<generate-strong-uuid>                    # Required
NODE_ENV=production|development                   # Default: development
PORT=3001                                         # Default: 3001

# CORS
CORS_ORIGIN=https://domain.com,https://other.com # Comma-separated

# Ollama LLM
OLLAMA_HOST=http://localhost:11434               # Default
OLLAMA_MODEL_DEFAULT=qwen2:7b                     # Default model

# Vector Store: Chroma (Local)
USE_CHROMA=true                                   # Default: true
CHROMA_URL=http://localhost:8000                 # Default

# Vector Store: Pinecone (Cloud)
USE_PINECONE=false                                # Default: false
PINECONE_API_KEY=<your-api-key>                  # If USE_PINECONE=true
PINECONE_ENVIRONMENT=us-west1                     # If USE_PINECONE=true

# Database
DATABASE_PATH=./data/app.db                       # Default
DATABASE_MODE=WAL                                 # Default
```

### Frontend (client/.env)

```bash
# API Configuration
VITE_API_URL=http://localhost:3001               # Development
VITE_API_URL=https://api.yourdomain.com          # Production
```

---

## 7. Scripts NPM Disponibles

### Root

```bash
npm run dev:full          # Start backend + frontend
npm test                  # Run all tests
npm run test:server       # Server tests only
npm run test:client       # Client tests only
npm run build             # Build both packages
npm run lint              # Lint all code
```

### Server

```bash
npm run dev               # Start dev server (nodemon)
npm start                 # Start production server
npm test                  # Run tests
npm run test:watch       # Watch mode
npm run test:coverage    # Coverage report
npm run test:ui          # Vitest UI
npm run lint             # ESLint
```

### Client

```bash
npm run dev               # Start Vite dev server
npm run build             # Build for production
npm run preview           # Preview production build
npm test                  # Run tests
npm run test:watch       # Watch mode
npm run test:coverage    # Coverage report
npm run test:e2e         # E2E tests (Playwright)
npm run test:e2e:ui      # E2E UI
npm run lint             # ESLint
```

---

## 8. Troubleshooting

### Port déjà en utilisation

```bash
# Trouver processus
lsof -i :3001
lsof -i :5173

# Tuer processus
kill -9 <PID>

# Ou changer port (backend)
PORT=3002 npm run dev
```

### Ollama ne démarre pas

```bash
# Vérifier docker
docker ps

# Logs
docker logs ollama

# Redémarrer
docker-compose restart ollama

# Tester connexion
curl http://localhost:11434/api/tags
```

### Erreur: "Cannot connect to Chroma"

```bash
# Vérifier Chroma
docker logs chroma

# Redémarrer
docker-compose restart chroma

# Ou utiliser Pinecone
USE_CHROMA=false
USE_PINECONE=true
PINECONE_API_KEY=<key>
```

### Tests qui échouent

```bash
# Clear cache
rm -rf server/node_modules/.vitest
rm -rf client/node_modules/.vitest

# Reinstall
npm install

# Retry
npm test
```

### CORS Error

```bash
# Vérifier .env
CORS_ORIGIN=http://localhost:5173,http://localhost:3001

# Redémarrer server
npm run dev
```

### Database locked

```bash
# SQLite WAL issue
rm server/data/app.db-shm
rm server/data/app.db-wal

# Restart server
npm run dev
```

---

## 9. Monitoring

### Health Check

```bash
curl http://localhost:3001/healthz
```

### API Status

```bash
curl http://localhost:3001/api/config \
  -H "X-API-Key: test-key"
```

### Database Size

```bash
sqlite3 server/data/app.db ".tables"
sqlite3 server/data/app.db "SELECT COUNT(*) FROM documents"
```

### Logs

**Server logs** (development):
```bash
# Check terminal output
# All requests logged via Morgan
```

**Docker logs**:
```bash
docker logs <container-id>
docker logs -f ollama
```

---

## 10. Backup & Restore

### Backup Database

```bash
# Copy SQLite file
cp server/data/app.db backup-$(date +%Y%m%d-%H%M%S).db

# Export as JSON
curl http://localhost:3001/api/export/database/full \
  -H "X-API-Key: test-key" \
  -o database-backup.json
```

### Restore Database

```bash
# Restore from backup
cp backup-20250215-103000.db server/data/app.db

# Restart server
npm run dev
```

---

## 11. Mise à Jour

### Mise à jour de l'Application

```bash
# Pull latest changes
git pull origin main

# Update dependencies
npm install

# Rebuild everything
npm run build

# Restart services
docker-compose restart

# Or locally:
npm run dev:full
```

### Mise à jour des Modèles Ollama

```bash
# List all models
ollama list

# Pull new model
ollama pull mistral:latest

# Remove old model
ollama rm qwen2:old-version

# Verify in app
curl http://localhost:3001/api/models \
  -H "X-API-Key: test-key"
```

---

**Document Version**: 1.0  
**Dernière mise à jour**: Février 2025
