# ✅ Vérifier que le RAG Fonctionne - Guide Complet

Comment vérifier que votre PDF est utilisé par le chat et que le RAG pipeline fonctionne correctement.

---

## 🎯 Vérification en 5 Étapes

### **Étape 1: Démarrer les services**

```bash
./scripts/dev.sh
```

Wait for:
```
✅ Chroma started
✅ Backend started
✅ Frontend started
```

---

### **Étape 2: Ouvrir l'interface**

Ouvrez: **http://localhost:5173**

Vous devriez voir:
- ✅ Chat interface
- ✅ "Upload Document" button
- ✅ Model selector (gemma4:12b, etc.)

---

### **Étape 3: Uploader un PDF de test**

**Créons un PDF de test:**

```bash
cat > /tmp/test-document.txt << 'EOF'
DÉCATHLON UNIVERSITY

Décathlon University is our global training program for employees.

Key Information:
- Founded: 2015
- Locations: 15 countries
- Employees trained: 50,000+
- Programs offered: Leadership, Technical, Sales

CEO: John Smith
Founded by: Décathlon Group
Revenue: €15 billion

Contact: university@decathlon.com
EOF

echo "Test document created at /tmp/test-document.txt"
```

**Convertir en PDF (si vous avez `wkhtmltopdf` ou `pandoc`):**

```bash
# Option 1: Utiliser un vrai PDF
# Téléchargez un PDF quelconque et uploadez-le

# Option 2: Créer un PDF simple avec du texte
# Utilisez un outil online si nécessaire
```

**Ou créer un PDF avec Python:**

```bash
python3 << 'EOF'
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas

c = canvas.Canvas("/tmp/test-doc.pdf", pagesize=letter)
c.drawString(100, 750, "DECATHLON UNIVERSITY")
c.drawString(100, 730, "")
c.drawString(100, 710, "Decathlon University is our global training program.")
c.drawString(100, 690, "Founded: 2015")
c.drawString(100, 670, "Employees trained: 50,000+")
c.drawString(100, 650, "CEO: John Smith")
c.drawString(100, 630, "Contact: university@decathlon.com")
c.save()
print("✅ PDF created: /tmp/test-doc.pdf")
EOF
```

**Puis uploadez le PDF:**
1. Click "Upload Document" button
2. Select PDF file
3. Wait for ✅ confirmation

---

### **Étape 4: Vérifier dans les logs**

Ouvrez un autre terminal et lisez les logs backend:

```bash
tail -f /tmp/backend.log
```

Vous devriez voir quelque chose comme:

```
📄 Loading PDF from: /var/folders/.../test-doc.pdf
✓ Extracted 1 pages
✂️  Splitting into chunks...
✓ Created 3 chunks
💾 Storing chunks...
✓ Added 3 documents to Chroma
✅ Ingestion Complete! (3 chunks from test-doc.pdf)
```

✅ **Si vous voyez cela, le PDF est correctement ingéré!**

---

### **Étape 5: Tester le Chat**

**Test 1: Question simple basée sur le PDF**

```
Question: "What is Decathlon University?"
```

Expected response should mention:
- Global training program
- Founded 2015
- Employees trained

**Test 2: Question spécifique**

```
Question: "Who is the CEO of Decathlon University?"
```

Expected response: "John Smith"

**Test 3: Question détail**

```
Question: "How many employees have been trained?"
```

Expected response: "50,000+"

---

## 🔍 Vérifications Approfondies

### **1. Vérifier que Chroma a les données**

```bash
# Check Chroma health
curl http://localhost:8000/api/v1
# Should return: {}

# List all collections
curl http://localhost:8000/api/v1/collections
```

---

### **2. Vérifier les chunks stockés**

Créez ce script pour voir ce qui est dans Chroma:

```bash
cat > /tmp/check-chroma.py << 'EOF'
import chromadb

# Connect to Chroma
client = chromadb.HttpClient(host="localhost", port=8000)

# Get all collections
collections = client.list_collections()
print(f"📚 Collections in Chroma: {len(collections)}")

for collection in collections:
    print(f"\n📖 Collection: {collection.name}")
    
    # Get all items in collection
    items = collection.get()
    print(f"   Total items: {len(items['ids'])}")
    
    # Show first few items
    for i, (id_, doc, meta) in enumerate(zip(items['ids'][:3], items['documents'][:3], items['metadatas'][:3])):
        print(f"   Chunk {i+1}:")
        print(f"     ID: {id_}")
        print(f"     Text: {doc[:100]}...")
        print(f"     Metadata: {meta}")

EOF

python3 /tmp/check-chroma.py
```

Expected output:
```
📚 Collections in Chroma: 1
📖 Collection: documents
   Total items: 3
   Chunk 1:
     ID: uuid-1
     Text: DECATHLON UNIVERSITY Decathlon University is our global...
     Metadata: {'source': 'test-doc.pdf', 'page': 0}
```

✅ **Si vous voyez les chunks, ils sont stockés correctement!**

---

### **3. Vérifier que le chat récupère les chunks**

Ajoutez du logging au backend pour voir les chunks récupérés.

Créez ce test:

```bash
cat > /tmp/test-rag.sh << 'EOF'
#!/bin/bash

# Test 1: Vérifier la configuration
echo "🔍 Test 1: Configuration Chroma"
grep CHROMA /Users/mac-Z16MSMAI/Documents/front/agentic-personal-assistant/server/.env

echo ""
echo "🔍 Test 2: Vérifier que le backend reçoit les requests"
curl -X POST http://localhost:3001/api/chat \
  -H "Content-Type: application/json" \
  -H "X-API-Key: test-key" \
  -d '{
    "message": "What is Decathlon University?",
    "session_id": "test-session",
    "model": "gemma4:12b"
  }' | jq '.'

EOF

chmod +x /tmp/test-rag.sh
bash /tmp/test-rag.sh
```

---

## 📊 Logs à Vérifier

### **Backend Logs** (`/tmp/backend.log`)

**Pour l'upload:**
```
POST /api/ingest 200 ← Status 200 = SUCCESS ✅
✓ Extracted X pages
✓ Created Y chunks
✓ Added Y documents to Chroma
✅ Ingestion Complete!
```

**Pour le chat:**
```
POST /api/chat 200 ← Status 200 = SUCCESS ✅
📦 Initializing Vector Store: CHROMA
🧠 Running agent (model: gemma4:12b) for: "question"
✓ Found X relevant chunks
```

### **Frontend Logs** (`/tmp/frontend.log`)

```
✅ PDF uploaded
✅ Chat message sent
✅ Response received
```

### **Chroma Logs** (`/tmp/chroma.log`)

```
✓ Collection created
✓ Documents added
✓ Query executed
```

---

## ✅ Checklist de Vérification Complète

### **PDF Upload**
- [ ] Fichier accepté (200 OK dans logs)
- [ ] Pages extraites (✓ Extracted X pages)
- [ ] Chunks créés (✓ Created Y chunks)
- [ ] Données dans Chroma (✓ Added Y documents to Chroma)
- [ ] Aucune erreur (pas de ❌ en rouge)

### **Chroma Stockage**
- [ ] Chroma répond à `curl http://localhost:8000/api/v1`
- [ ] Collections présentes (`python3 /tmp/check-chroma.py`)
- [ ] Documents présents dans la collection
- [ ] Métadonnées correctes (source, page)

### **Chat/RAG**
- [ ] Message envoyé sans erreur (status 200)
- [ ] Réponse reçue
- [ ] Réponse mentionne le contenu du PDF
- [ ] Pas d'erreur "Missing CHROMA_URL"
- [ ] Pas d'erreur "ChromaConnectionError"

### **Qualité de la Réponse**
- [ ] Réponse pertinente par rapport à la question
- [ ] Réponse basée sur le PDF (pas de réponse générique)
- [ ] Détails du PDF présents dans la réponse
- [ ] Pas de hallucinations (informations inventées)

---

## 🆘 Troubleshooting

### **Problème: "Missing CHROMA_URL"**

```bash
# Vérifier la configuration
grep CHROMA_URL server/.env

# Si vide, ajouter:
echo "CHROMA_URL=http://localhost:8000" >> server/.env

# Redémarrer le backend
pkill -f "npm start"
cd server && npm start
```

### **Problème: PDF upload réussit mais chat ne fonctionne pas**

```bash
# 1. Vérifier les logs
tail -f /tmp/backend.log

# 2. Vérifier que Chroma répond
curl http://localhost:8000/api/v1

# 3. Vérifier les données dans Chroma
python3 /tmp/check-chroma.py

# 4. Si vide, relancer l'upload du PDF
```

### **Problème: Chat répond mais ne mentionne pas le PDF**

Cela signifie:
- ✅ RAG fonctionne (retrouve les chunks)
- ❌ Chunks ne sont pas pertinents OU
- ❌ LLM ignore les chunks

Solutions:
```bash
# 1. Vérifier les chunks
python3 /tmp/check-chroma.py

# 2. Essayer une question plus spécifique
"What does the document say about...?"

# 3. Vérifier que le prompt du LLM utilise les chunks
# Voir server/agent.js ou server/index.js
```

### **Problème: "ChromaConnectionError"**

```bash
# Redémarrer Chroma
./scripts/scripts/start/start-chroma.sh

# Ou redémarrer tout
pkill -f "npm start"
pkill -f "chroma"
./scripts/dev.sh
```

---

## 📈 Tests Avancés

### **Test 1: Vérifier la similarité vectorielle**

```bash
python3 << 'EOF'
import chromadb

client = chromadb.HttpClient(host="localhost", port=8000)
collection = client.get_collection(name="documents")

# Simuler une recherche
results = collection.query(
    query_texts=["What is Decathlon University?"],
    n_results=3
)

print("🔍 Search Results:")
print(f"Found {len(results['documents'][0])} chunks")
for i, (doc, dist) in enumerate(zip(results['documents'][0], results['distances'][0])):
    print(f"\nChunk {i+1} (distance: {dist:.2f}):")
    print(f"  {doc[:150]}...")

EOF
```

### **Test 2: Vérifier le pipeline complet**

```bash
cat > /tmp/test-rag-pipeline.sh << 'EOF'
#!/bin/bash

echo "🚀 RAG Pipeline Test"
echo ""

# 1. Check Chroma
echo "1️⃣ Checking Chroma..."
if curl -s http://localhost:8000/api/v1 > /dev/null; then
    echo "   ✅ Chroma is running"
else
    echo "   ❌ Chroma is NOT running"
    exit 1
fi

# 2. Check Backend
echo "2️⃣ Checking Backend..."
if curl -s http://localhost:3001/health > /dev/null; then
    echo "   ✅ Backend is running"
else
    echo "   ❌ Backend is NOT running"
    exit 1
fi

# 3. Check Chroma data
echo "3️⃣ Checking Chroma data..."
python3 << 'PYTHON'
import chromadb
try:
    client = chromadb.HttpClient(host="localhost", port=8000)
    collections = client.list_collections()
    if len(collections) > 0:
        print(f"   ✅ Found {len(collections)} collections")
        for col in collections:
            items = col.get()
            print(f"      - {col.name}: {len(items['ids'])} documents")
    else:
        print("   ⚠️  No collections found (upload a PDF first)")
except Exception as e:
    print(f"   ❌ Error: {e}")
PYTHON

echo ""
echo "✅ RAG Pipeline is ready!"

EOF

chmod +x /tmp/test-rag-pipeline.sh
bash /tmp/test-rag-pipeline.sh
```

---

## 🎯 Summary: Comment Vérifier

| Vérification | Commande | What to See |
|-------------|----------|------------|
| **PDF ingéré** | `tail -f /tmp/backend.log` | `✅ Ingestion Complete!` |
| **Chunks stockés** | `python3 /tmp/check-chroma.py` | Collections avec documents |
| **Chat fonctionne** | Tapez dans l'interface | Réponse en quelques secondes |
| **Réponse utilise PDF** | Posez une question spécifique | Réponse mentionne le PDF |
| **RAG complet** | Bash `/tmp/test-rag-pipeline.sh` | ✅ pour tous les checks |

---

## ✨ Le Test Ultime

**Étape 1:** Upload un PDF avec info unique
```
"The magic number is 42"
```

**Étape 2:** Posez la question exacte
```
"What is the magic number?"
```

**Étape 3:** Vérifiez la réponse
- ✅ Si AI répond "42" → **RAG fonctionne!** 🎉
- ❌ Si AI donne une autre réponse → Vérifier les logs

---

## 📚 Resources

- **Chroma Docs:** https://docs.trychroma.com/
- **LangChain RAG:** https://js.langchain.com/
- **Vector DB Concepts:** https://docs.trychroma.com/getting-started

---

**Ready to verify?** Run:

```bash
# 1. Start services
./scripts/dev.sh

# 2. Upload a PDF with unique content
# 3. Ask a question about it
# 4. Check if answer uses the PDF content

# 5. View logs
tail -f /tmp/backend.log
```

Enjoy testing! 🚀
