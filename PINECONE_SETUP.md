# Pinecone Setup Guide

## Problem: "Cannot connect to Pinecone" Error

When uploading a PDF, you might see:
```
PineconeConnectionError: Request failed to reach Pinecone
Error: unable to get local issuer certificate (UNABLE_TO_GET_ISSUER_CERT_LOCALLY)
```

This happens when Pinecone credentials are missing or invalid.

---

## ✅ Quick Fix: 5 Minutes

### Step 1: Create Pinecone Account & Get API Key

1. Go to https://app.pinecone.io
2. Sign up or log in
3. Navigate to **API Keys** section
4. Copy your API key (looks like `pcsk_xxxxxxxxxxxxx`)

### Step 2: Create a Pinecone Index

1. In Pinecone dashboard, go to **Indexes**
2. Click **Create Index**
3. Set these values:
   - **Name**: `agentic-rag-index` (or any name you prefer)
   - **Dimension**: `384` (for `llama-text-embed-v2` model)
   - **Metric**: `cosine` (recommended for embeddings)
   - **Cloud**: `aws` or your preference
   - **Region**: `us-east-1` (or nearest to you)
4. Click **Create Index** and wait 1-2 minutes

### Step 3: Update server/.env

Open `server/.env` and replace placeholders:

```bash
# Before (with placeholders):
PINECONE_API_KEY=pcsk_zzzzz
PINECONE_INDEX=agentic-rag-index

# After (with your real values):
PINECONE_API_KEY=pcsk_your_real_api_key_here
PINECONE_INDEX=agentic-rag-index
```

### Step 4: Restart Server

```bash
cd server
npm start
```

### Step 5: Test Upload

1. Go to frontend: http://localhost:5173 (or 5174)
2. Choose a PDF file
3. Click **Upload**
4. Should show ✅ success message

---

## 🔍 Troubleshooting

### Error: "UNABLE_TO_GET_ISSUER_CERT_LOCALLY"

**Causes:**
- `PINECONE_API_KEY` is invalid or placeholder value
- Pinecone API is unreachable (network issue)
- SSL certificate verification failed

**Fixes:**
1. Verify your API key is correct (check https://app.pinecone.io/api-keys)
2. Verify your index name matches the one in Pinecone dashboard
3. Check your internet connection
4. Try disabling SSL verification (dev only):
   ```bash
   NODE_TLS_REJECT_UNAUTHORIZED=0 npm start  # NOT for production!
   ```

### Error: "Pinecone not configured"

**Causes:**
- `PINECONE_API_KEY` or `PINECONE_INDEX` env vars are missing

**Fix:**
- Make sure both values are set in `server/.env`
- Restart server after updating `.env`

### Error: "Only PDF files are allowed"

**Cause:** You uploaded a non-PDF file

**Fix:** Upload a `.pdf` file

---

## 📋 Verify Setup

Run this command to test Pinecone connection:

```bash
# In server directory
node -e "
import('dotenv/config').then(() => {
  import('@pinecone-database/pinecone').then(({ Pinecone }) => {
    const pc = new Pinecone.Pinecone();
    pc.listIndexes().then(
      () => console.log('✅ Pinecone connected!'),
      (err) => console.error('❌ Connection failed:', err.message)
    );
  });
});
"
```

---

## 🛡️ Security Best Practices

1. **Never commit `.env` files** — Add `server/.env` to `.gitignore`
2. **Keep API key secret** — Treat it like a password
3. **For production:**
   - Store in environment variables (not `.env` file)
   - Use restricted API keys with specific permissions
   - Consider proxy layer for token validation

---

## 📚 More Resources

- **Pinecone Docs**: https://docs.pinecone.io
- **LangChain Pinecone Integration**: https://js.langchain.com/docs/integrations/vectorstores/pinecone
- **API Key Management**: https://docs.pinecone.io/administration/api-keys/

---

## Alternative: Local Vector DB (No Pinecone)

If you don't want to use Pinecone, you can use a local vector database like:

- **SQLite + pgvector** (simple, no external services)
- **Milvus** (open-source, Docker-based)
- **Weaviate** (open-source, Docker-based)
- **Chroma** (lightweight, in-memory/persistent)

Contact us if you want to switch from Pinecone to a local solution.

---

Last updated: 2026-09-26
