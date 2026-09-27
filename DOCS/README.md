# 📚 Documentation Technique Complète

## 🚀 Quick Start (5 minutes)

Vous êtes pressé? Voici le chemin le plus court:

1. **Nouveau Developer?** → [05-SETUP_GUIDE.md](./05-SETUP_GUIDE.md) (Section 2: Installation Locale)
2. **Comprendre l'Architecture?** → [01-OVERVIEW.md](./01-OVERVIEW.md) (Section 1: Architecture Overview)
3. **Faire une Requête API?** → [04-API_SPEC.md](./04-API_SPEC.md) (Sections 2-7)
4. **Besoin d'une Query SQL?** → [06-DATABASE_SCHEMA.md](./06-DATABASE_SCHEMA.md) (Sections 5-6)

---

## 📋 Index Complet

### 0️⃣ [**07-CI_CD_TESTING.md**](./07-CI_CD_TESTING.md) - CI/CD & Testing Guide

**Pour qui**: QA Engineers, DevOps, All Developers  
**Durée de lecture**: 15-20 minutes  
**Ce qu'on y trouve**:
- ✅ Local CI/CD pipeline setup
- ✅ Running unit tests (45 tests)
- ✅ E2E testing with Playwright
- ✅ Coverage reports generation
- ✅ GitHub Actions documentation
- ✅ Troubleshooting guide
- ✅ Best practices for testing

**Cas d'usage**:
- Setup local testing environment
- Run tests before committing
- Generate coverage reports
- Fix failing tests
- Understand CI/CD pipeline

---

### 1️⃣ [**01-OVERVIEW.md**](./01-OVERVIEW.md) - Vue d'Ensemble Architecture

**Pour qui**: CTO, Tech Leads, Architects  
**Durée de lecture**: 15-20 minutes  
**Ce qu'on y trouve**:
- ✅ Diagramme d'architecture layered
- ✅ Stack technologique complet (Node.js, React, SQLite, Ollama, Chroma)
- ✅ Design patterns utilisés (Repository, Adapter, Middleware, Factory)
- ✅ Sécurité & authentification (API Key validation)
- ✅ Performance & monitoring (Morgan logging, express-rate-limit)
- ✅ Scaling strategies & migration paths

**Cas d'usage**:
- Présentation architecture à stakeholders
- Planning de migration vers PostgreSQL/Kubernetes
- Code review à haut niveau
- Documentation pour onboarding engineers

---

### 2️⃣ [**02-CODE_STRUCTURE.md**](./02-CODE_STRUCTURE.md) - Cartographie du Code

**Pour qui**: Developers, DevOps Engineers  
**Durée de lecture**: 20-25 minutes  
**Ce qu'on y trouve**:
- ✅ Arborescence complète du projet
- ✅ Cartographie des modules avec responsabilités
- ✅ Data flow diagrams (Request → Response)
- ✅ State management patterns
- ✅ Dependency graph (imports/exports)
- ✅ File sizes & LOC analysis

**Cas d'usage**:
- Trouver où écrire le code pour une nouvelle feature
- Comprendre comment les modules communiquent
- Onboarding nouveau developer
- Refactoring planning

---

### 3️⃣ [**03-DIAGRAMS.md**](./03-DIAGRAMS.md) - Diagrammes Visuels

**Pour qui**: Visual learners, Architects  
**Durée de lecture**: 10-15 minutes  
**Ce qu'on y trouve**:
- ✅ 7 Mermaid diagrams:
  - Container diagram (Frontend/Backend/Database)
  - Chat flow sequence diagram
  - Export sequence diagram  
  - Entity-Relationship Diagram (ERD)
  - State machine (Conversation lifecycle)
  - API gateway routing
  - Deployment architecture

**Cas d'usage**:
- Présentations visuelles
- Whiteboarding sessions
- Documentation pull requests
- Team discussions

---

### 4️⃣ [**04-API_SPEC.md**](./04-API_SPEC.md) - Spécification REST API

**Pour qui**: Frontend Developers, API Consumers  
**Durée de lecture**: 25-30 minutes  
**Ce qu'on y trouve**:
- ✅ 50+ API endpoints documentés
- ✅ Request/response examples (JSON)
- ✅ HTTP status codes & error handling
- ✅ Rate limiting (100 req / 15 min)
- ✅ Authentication (X-API-Key header)
- ✅ Groupes d'endpoints:
  - Chat & Conversations
  - Document Management
  - Advanced Search
  - Export & Backup
  - System Configuration

**Cas d'usage**:
- Appeler l'API depuis le frontend
- Générer OpenAPI/Swagger YAML
- Tester avec Postman/Insomnia
- Intégration tierce

---

### 5️⃣ [**05-SETUP_GUIDE.md**](./05-SETUP_GUIDE.md) - Installation & Déploiement

**Pour qui**: DevOps, System Administrators, New Developers  
**Durée de lecture**: 30-40 minutes  
**Ce qu'on y trouve**:
- ✅ Prérequis système (Node, Docker, Git)
- ✅ Installation locale (8 étapes)
- ✅ Installation modèles Ollama (automatisée & manuelle)
- ✅ Tests (Unit, E2E, Local CI)
- ✅ Déploiement production:
  - Docker Compose
  - Kubernetes
  - AWS EC2
  - Vercel (Frontend)
  - Railway/Render (Backend)
- ✅ Variables d'environnement
- ✅ Scripts NPM
- ✅ Troubleshooting
- ✅ Monitoring & Backup/Restore

**Cas d'usage**:
- Mise en place environnement de développement
- Déploiement staging/production
- Problème de démarrage application
- Configuration CI/CD

---

### 6️⃣ [**06-DATABASE_SCHEMA.md**](./06-DATABASE_SCHEMA.md) - Schéma Base de Données

**Pour qui**: Database Administrators, Backend Developers  
**Durée de lecture**: 20-25 minutes  
**Ce qu'on y trouve**:
- ✅ Vue d'ensemble SQLite (WAL mode, WAL files)
- ✅ Schéma relationnel complet (ERD)
- ✅ Définitions de 3 tables:
  - documents (métadonnées PDF)
  - conversations (sessions utilisateur)
  - messages (historique chat)
- ✅ Foreign keys & intégrité référentielle
- ✅ 10+ requêtes courantes (CREATE, SELECT, UPDATE, DELETE, STATISTICS)
- ✅ Performance & optimisations (Indexes, EXPLAIN QUERY PLAN)
- ✅ Migrations futures (PostgreSQL, Users, Versioning)
- ✅ Sauvegarde & restauration
- ✅ Maintenabilité (VACUUM, ANALYZE, Integrity check)

**Cas d'usage**:
- Écrire queries SQLite
- Ajouter nouvelles colonnes/tables
- Optimiser performance database
- Migration vers PostgreSQL
- Debugging database issues

---

## 🎯 Parcours de Lecture par Rôle

### 👨‍💻 **Nouveau Developer Frontend**

1. Lire [01-OVERVIEW.md](./01-OVERVIEW.md) sections 1-3 (Vue générale, Stack Tech)
2. Lire [02-CODE_STRUCTURE.md](./02-CODE_STRUCTURE.md) sections 2-4 (Frontend structure)
3. Consulter [04-API_SPEC.md](./04-API_SPEC.md) sections 1-4 (Chat, Config API)
4. Suivre [05-SETUP_GUIDE.md](./05-SETUP_GUIDE.md) sections 2, 8 (Installation locale)
5. Utiliser [03-DIAGRAMS.md](./03-DIAGRAMS.md) pour visualiser

**Durée totale**: ~1.5 heures

---

### 👨‍💻 **Nouveau Developer Backend**

1. Lire [01-OVERVIEW.md](./01-OVERVIEW.md) complètement
2. Lire [02-CODE_STRUCTURE.md](./02-CODE_STRUCTURE.md) complètement
3. Consulter [06-DATABASE_SCHEMA.md](./06-DATABASE_SCHEMA.md) sections 1-6 (Schema, Queries)
4. Consulter [04-API_SPEC.md](./04-API_SPEC.md) sections 5-10 (Search, Export, System)
5. Suivre [05-SETUP_GUIDE.md](./05-SETUP_GUIDE.md) sections 2, 6, 7, 8

**Durée totale**: ~2.5 heures

---

### 👨‍💼 **Tech Lead / Architect**

1. Lire [01-OVERVIEW.md](./01-OVERVIEW.md) complètement
2. Lire [03-DIAGRAMS.md](./03-DIAGRAMS.md) complètement
3. Lire [02-CODE_STRUCTURE.md](./02-CODE_STRUCTURE.md) sections 2, 5 (Arbo, Deps)
4. Consulter [06-DATABASE_SCHEMA.md](./06-DATABASE_SCHEMA.md) sections 7-8 (Futures, Migration)
5. Consulter [05-SETUP_GUIDE.md](./05-SETUP_GUIDE.md) section 5 (Déploiement)

**Durée totale**: ~2 heures

---

### 🚀 **DevOps / System Admin**

1. Consulter [05-SETUP_GUIDE.md](./05-SETUP_GUIDE.md) complètement
2. Lire [01-OVERVIEW.md](./01-OVERVIEW.md) sections 4, 5 (Sécurité, Performance)
3. Lire [06-DATABASE_SCHEMA.md](./06-DATABASE_SCHEMA.md) sections 6, 9 (Performance, Maintenance)
4. Consulter [03-DIAGRAMS.md](./03-DIAGRAMS.md) section 7 (Deployment)

**Durée totale**: ~1.5 heures

---

### 🔐 **Security Auditor**

1. Lire [01-OVERVIEW.md](./01-OVERVIEW.md) section 4 (Security)
2. Lire [04-API_SPEC.md](./04-API_SPEC.md) section 8 (Error Codes & Security)
3. Consulter [02-CODE_STRUCTURE.md](./02-CODE_STRUCTURE.md) section 5 (Dependencies)
4. Lire [05-SETUP_GUIDE.md](./05-SETUP_GUIDE.md) section 6 (Environment Variables Secrets)

**Durée totale**: ~1 heure

---

## 🔍 Recherche Rapide par Sujet

### API & Endpoints

| Sujet | Fichier | Sections |
|-------|---------|----------|
| Tous les endpoints | [04-API_SPEC.md](./04-API_SPEC.md) | 2-10 |
| Chat API | [04-API_SPEC.md](./04-API_SPEC.md) | 2 |
| Conversations API | [04-API_SPEC.md](./04-API_SPEC.md) | 3 |
| Search API | [04-API_SPEC.md](./04-API_SPEC.md) | 5 |
| Export API | [04-API_SPEC.md](./04-API_SPEC.md) | 6 |
| Authentication | [01-OVERVIEW.md](./01-OVERVIEW.md) | 4.1 |

### Architecture & Design

| Sujet | Fichier | Sections |
|-------|---------|----------|
| Architecture Overview | [01-OVERVIEW.md](./01-OVERVIEW.md) | 1 |
| Design Patterns | [01-OVERVIEW.md](./01-OVERVIEW.md) | 3 |
| Data Flow | [02-CODE_STRUCTURE.md](./02-CODE_STRUCTURE.md) | 4 |
| Module Dependencies | [02-CODE_STRUCTURE.md](./02-CODE_STRUCTURE.md) | 5 |
| Diagrams Visuels | [03-DIAGRAMS.md](./03-DIAGRAMS.md) | All |

### Database

| Sujet | Fichier | Sections |
|-------|---------|----------|
| Schéma Tables | [06-DATABASE_SCHEMA.md](./06-DATABASE_SCHEMA.md) | 3 |
| Foreign Keys | [06-DATABASE_SCHEMA.md](./06-DATABASE_SCHEMA.md) | 4 |
| Requêtes SQL | [06-DATABASE_SCHEMA.md](./06-DATABASE_SCHEMA.md) | 5 |
| Performance & Indexes | [06-DATABASE_SCHEMA.md](./06-DATABASE_SCHEMA.md) | 6 |
| Migration PostgreSQL | [06-DATABASE_SCHEMA.md](./06-DATABASE_SCHEMA.md) | 7 |

### Installation & Déploiement

| Sujet | Fichier | Sections |
|-------|---------|----------|
| Installation Locale | [05-SETUP_GUIDE.md](./05-SETUP_GUIDE.md) | 2 |
| Modèles Ollama | [05-SETUP_GUIDE.md](./05-SETUP_GUIDE.md) | 3 |
| Tests | [05-SETUP_GUIDE.md](./05-SETUP_GUIDE.md) | 4 |
| Déploiement Production | [05-SETUP_GUIDE.md](./05-SETUP_GUIDE.md) | 5 |
| Variables d'Environnement | [05-SETUP_GUIDE.md](./05-SETUP_GUIDE.md) | 6 |
| Troubleshooting | [05-SETUP_GUIDE.md](./05-SETUP_GUIDE.md) | 8 |
| Backup & Restore | [05-SETUP_GUIDE.md](./05-SETUP_GUIDE.md) | 10 |

---

## 📊 Documentation Matrice de Couverture

| Aspect | 01 | 02 | 03 | 04 | 05 | 06 |
|--------|----|----|----|----|----|----|
| **Architecture** | ✅✅ | ✅ | ✅✅ | - | - | - |
| **Code Structure** | - | ✅✅✅ | - | - | - | - |
| **API Reference** | - | - | - | ✅✅✅ | ✅ | - |
| **Database** | - | - | - | - | - | ✅✅✅ |
| **Setup & Deploy** | - | - | - | - | ✅✅✅ | - |
| **Security** | ✅ | - | - | ✅ | ✅ | - |
| **Performance** | ✅ | - | - | - | - | ✅ |

Legend: ✅ (couvert), ✅✅ (détaillé), ✅✅✅ (très détaillé)

---

## 🚨 Troubleshooting Rapide

### Application ne démarre pas

→ [05-SETUP_GUIDE.md](./05-SETUP_GUIDE.md) Section 8 (Troubleshooting)

### API returns 500 error

→ [04-API_SPEC.md](./04-API_SPEC.md) Section 8 (Error Codes)

### Database is locked

→ [06-DATABASE_SCHEMA.md](./06-DATABASE_SCHEMA.md) Section 9 (Maintenance)

### Ollama models not loading

→ [05-SETUP_GUIDE.md](./05-SETUP_GUIDE.md) Section 3 (Model Installation)

### CORS error

→ [05-SETUP_GUIDE.md](./05-SETUP_GUIDE.md) Section 8 (CORS Error)

### Performance issues

→ [06-DATABASE_SCHEMA.md](./06-DATABASE_SCHEMA.md) Section 6 (Performance & Indexes)

---

## 📞 Questions Fréquentes (FAQ)

### Q: Où est le code du chat?
**A**: [02-CODE_STRUCTURE.md](./02-CODE_STRUCTURE.md) Section 3 → `server/index.js` POST `/api/chat`

### Q: Comment ajouter une colonne à la database?
**A**: [06-DATABASE_SCHEMA.md](./06-DATABASE_SCHEMA.md) Sections 2-3 → Use ALTER TABLE

### Q: Quels sont les endpoints disponibles?
**A**: [04-API_SPEC.md](./04-API_SPEC.md) Sections 2-10 → Complete REST API reference

### Q: Comment déployer en production?
**A**: [05-SETUP_GUIDE.md](./05-SETUP_GUIDE.md) Section 5 → Multiple options (Docker, K8s, Cloud)

### Q: Comment optimiser les requêtes?
**A**: [06-DATABASE_SCHEMA.md](./06-DATABASE_SCHEMA.md) Sections 5-6 → Common queries & indexes

### Q: Qu'est-ce que WAL mode?
**A**: [06-DATABASE_SCHEMA.md](./06-DATABASE_SCHEMA.md) Section 1 → SQLite optimization for concurrency

---

## 📝 Notes de Version

**Version**: 1.0  
**Date**: Février 2025  
**Statut**: ✅ Complete (6/6 documents)

### Contenu

- ✅ **01-OVERVIEW.md** - Architecture & Design Patterns
- ✅ **02-CODE_STRUCTURE.md** - Module Cartography & Flows
- ✅ **03-DIAGRAMS.md** - 7 Mermaid Diagrams
- ✅ **04-API_SPEC.md** - 50+ Endpoints Reference
- ✅ **05-SETUP_GUIDE.md** - Installation & Deployment
- ✅ **06-DATABASE_SCHEMA.md** - SQLite Schema & Maintenance

### Prochaines Étapes

- [ ] Add OpenAPI/Swagger YAML generation
- [ ] Add performance benchmarks
- [ ] Add e-to-e testing guide
- [ ] Add migration guide (In-Memory → SQLite → PostgreSQL)
- [ ] Add troubleshooting flowcharts
- [ ] Add video tutorials links

---

## 🎓 Apprentissage & Ressources

### Concepts Clés

- **RAG (Retrieval-Augmented Generation)**: [01-OVERVIEW.md](./01-OVERVIEW.md) Section 1.2
- **Vector Store (Chroma/Pinecone)**: [01-OVERVIEW.md](./01-OVERVIEW.md) Section 1.2
- **Ollama LLM**: [05-SETUP_GUIDE.md](./05-SETUP_GUIDE.md) Section 3
- **SQLite WAL Mode**: [06-DATABASE_SCHEMA.md](./06-DATABASE_SCHEMA.md) Section 1

### Lectures Externes Recommandées

- SQLite WAL: https://www.sqlite.org/wal.html
- Express.js Best Practices: https://expressjs.com/en/advanced/best-practice-security.html
- React Hooks: https://react.dev/reference/react/hooks
- Ollama: https://ollama.ai/

---

**Dernière mise à jour**: Février 2025  
**Mainteneur**: @tariqlabs  
**License**: MIT
