# 🛠️ Development Mode: Infrastructure Only

Pour développer avec **hot-reload** et itérations rapides, utilisez `docker-compose.dev.yml`:

## 🚀 Quick Start (One-liner)

```bash
# Démarrer tout automatiquement
./dev-setup.sh

# Puis dans d'autres terminaux:
cd server && npm run dev
cd client && npm run dev
```

**C'est tout!** L'infrastructure démarre en arrière-plan, vous pouvez coder avec hot-reload.

---

## Quick Start Détaillé

```bash
# 1️⃣ Démarrer SEULEMENT l'infrastructure (Ollama + Chroma)
docker-compose -f docker-compose.dev.yml up

# ⏳ Attendez les logs:
# ✓ Ollama ready on :11434
# ✓ Chroma ready on :8000
# ✓ (Ne démarre PAS le serveur Express)

# 2️⃣ Dans un autre terminal, démarrer le serveur localement
cd server
cp .env.example .env
# Assurez-vous que VECTOR_DB=chroma dans .env
npm install
npm run dev
# 🔥 Hot-reload activé! Modifiez server/ → rechargement auto

# 3️⃣ Dans un 3ème terminal, démarrer le frontend
cd client
npm install
npm run dev
# 🔥 Hot-reload activé! Modifiez client/src/ → rechargement auto

# 4️⃣ Ouvrir le navigateur
open http://localhost:5173
```

---

## 📊 Comparaison des Modes

| Mode | Infrastructure | Server | Frontend | Idéal Pour |
|------|---|---|---|---|
| **`docker-compose.yml`** (Production) | Docker | Docker | npm dev | Demo, production-like |
| **`docker-compose.dev.yml`** (Dev Infra) | Docker | npm dev | npm dev | Development, hot-reload |
| **Fully Local** | Ollama local | npm dev | npm dev | Advanced users, offline |

---

## 🔥 Avantages du Mode Dev

✅ **Hot Reload** — Modifiez le code serveur, rechargement automatique (avec nodemon)  
✅ **Faster Iterations** — Pas de rebuild Docker à chaque changement  
✅ **Easy Debugging** — Logs du serveur directement dans le terminal  
✅ **Native Node.js** — Utilisez les outils Node.js habituels (debugger, profiler)  
✅ **SharedInfra** — Chroma + Ollama mutualisées entre plusieurs dev  

---

## 📁 Fichiers Modifiés

```
✓ Chroma data stored in ./chroma_data (local directory)
✓ Ollama models cached in Docker volume (ollama_data)
✓ Server + Frontend run locally (faster feedback)
```

**Note:** Utilisez `./chroma_data` local (pas de volume nommé) pour faciliter le debug des fichiers SQLite de Chroma.

---

## 🧹 Cleanup

```bash
# Arrêter l'infrastructure
docker-compose -f docker-compose.dev.yml down

# Garder les données
# ✓ ./chroma_data reste intacte (réutilisable)
# ✓ ollama_data volume reste intacte

# Reset complet
docker-compose -f docker-compose.dev.yml down -v
# ⚠️  Supprime chroma_data + ollama_data
# Prochaine startup redownload les models
```

---

## 🔍 Debugging Tips

### Voir les logs de Chroma
```bash
docker-compose -f docker-compose.dev.yml logs chroma -f
```

### Voir les logs de Ollama
```bash
docker-compose -f docker-compose.dev.yml logs ollama -f
```

### Vérifier la config du serveur
```bash
curl http://localhost:3001/api/config
# → { vectorStore: "CHROMA", config: {...} }
```

### Tester une recherche directement
```bash
# 1. Upload un PDF d'abord via l'UI
# 2. Tester la recherche
curl -X POST http://localhost:3001/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"Que dit le document?", "sessionId":"test"}'
```

---

## 🚀 Development Workflow

### Typique
```bash
# Terminal 1: Infrastructure (démarre une fois)
docker-compose -f docker-compose.dev.yml up

# Terminal 2: Backend (hot-reload avec nodemon)
cd server && npm run dev
# ✓ Modifiez server/tools.js → rechargement auto

# Terminal 3: Frontend (hot-reload avec Vite)
cd client && npm run dev
# ✓ Modifiez client/src/App.jsx → rechargement auto

# Terminal 4: Tests ou curls
curl http://localhost:3001/api/config
```

### Avec Debugging
```bash
# Backend avec Node debugger
cd server && node --inspect index.js

# Ouvrir chrome://inspect pour déboguer
```

---

## ⚠️ Pièges Courants

### ❌ Infrastructure pas prête
```
Error: connect ECONNREFUSED 127.0.0.1:8000
```
**Solution:** Vérifiez que `docker-compose -f docker-compose.dev.yml up` est toujours actif

### ❌ Port 3001 déjà utilisé
```
Error: listen EADDRINUSE :::3001
```
**Solution:** Changez PORT dans server/.env ou tuez le processus existant
```bash
lsof -i :3001 | awk 'NR!=1 {print $2}' | xargs kill -9
```

### ❌ Chroma: Permission denied
```
Error: EACCES: permission denied, mkdir './chroma_data'
```
**Solution:**
```bash
chmod 755 .
mkdir -p chroma_data
chmod 777 chroma_data
```

### ❌ Ollama model not found
```
Error: Model "nomic-embed-text" not found
```
**Solution:** Attendez que le script ollama-startup.sh finisse (3-5 min)
```bash
docker-compose -f docker-compose.dev.yml logs ollama | grep "pulling"
```

---

## 🎯 Quand Utiliser Quel Mode

| Scenario | Utilisez |
|----------|----------|
| Je veux tester localement l'app complète | `docker-compose.yml` |
| Je développe le code serveur activement | `docker-compose.dev.yml` |
| Je dois déboguer Chroma/Ollama | `docker-compose.dev.yml` + local logs |
| J'ai besoin de performance maximale | Fully local (sans Docker) |
| Je préfère la simplicité | `docker-compose.yml` (one-shot) |

---

## 📚 Prochaines Étapes

1. **Démarrer infra:** `docker-compose -f docker-compose.dev.yml up`
2. **Démarrer serveur:** `cd server && npm run dev`
3. **Démarrer frontend:** `cd client && npm run dev`
4. **Développer!** Les modifications sont appliquées en temps réel

---

**Last Updated:** 2024  
**Status:** Ready for development ✅
