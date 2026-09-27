# Deployment & Configuration Guide

## Development Setup (localhost)

### Prerequisites
```bash
# Install dependencies
npm run install:all

# Start Ollama
ollama serve &

# Create and configure server/.env
cp server/.env.example server/.env
# Edit: replace PINECONE_API_KEY and PINECONE_INDEX with real values
```

### Run Development Mode
```bash
npm run dev
# Server: http://localhost:3001
# Client: http://localhost:5173
```

**Features automatically enabled in dev:**
- ✅ CORS: `http://localhost:5173` allowed
- ✅ File uploads: work via `http://localhost:3001` (no CORS issues)
- ✅ Model selector: loads from local Ollama
- ✅ Session isolation: per-browser via localStorage

---

## Production Deployment

### Environment Variables

**Server (.env):**
```env
# LLM
OLLAMA_MODEL=qwen3.6:latest
OLLAMA_BASE_URL=http://ollama-service:11434

# Pinecone
PINECONE_API_KEY=<your production key>
PINECONE_INDEX=<your production index>

# Server
PORT=3001
NODE_ENV=production

# CORS: restrict to your domain(s)
CORS_ORIGIN=https://app.example.com,https://www.example.com

# Security
API_KEY=<strong random key for x-api-key header>
RATE_LIMIT_MAX=100
RATE_LIMIT_WINDOW_MS=60000
```

**Client (.env or .env.production):**
```env
VITE_API_URL=https://api.example.com
```

### Docker Deployment Example

**Dockerfile for server:**
```dockerfile
FROM node:22-alpine

WORKDIR /app/server
COPY server/package*.json ./
RUN npm install --production

COPY server/ .

ENV NODE_ENV=production
EXPOSE 3001

CMD ["node", "index.js"]
```

**Dockerfile for client:**
```dockerfile
FROM node:22-alpine AS build

WORKDIR /app/client
COPY client/package*.json ./
RUN npm install

COPY client/ .
ARG VITE_API_URL=https://api.example.com
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/client/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

**nginx.conf:**
```nginx
server {
    listen 80;
    root /usr/share/nginx/html;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://server:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

**docker-compose.yml:**
```yaml
version: '3.8'

services:
  server:
    build:
      context: .
      dockerfile: server.Dockerfile
    environment:
      PINECONE_API_KEY: ${PINECONE_API_KEY}
      PINECONE_INDEX: ${PINECONE_INDEX}
      OLLAMA_BASE_URL: http://ollama:11434
      CORS_ORIGIN: https://app.example.com
      API_KEY: ${API_KEY}
    depends_on:
      - ollama

  client:
    build:
      context: .
      dockerfile: client.Dockerfile
      args:
        VITE_API_URL: https://api.example.com
    ports:
      - "80:80"
    depends_on:
      - server

  ollama:
    image: ollama/ollama:latest
    volumes:
      - ollama_data:/root/.ollama
    environment:
      OLLAMA_HOST: 0.0.0.0:11434

volumes:
  ollama_data:
```

---

## Troubleshooting

### "Not allowed by CORS" on file upload
- ✅ Fixed in latest version
- Client automatically uses `http://localhost:3001` for localhost development
- For production, set `VITE_API_URL=https://api.example.com`
- Server ensures CORS headers on all responses

### "Ollama is unavailable"
- Ensure Ollama is running: `ollama serve`
- Check `OLLAMA_BASE_URL` points to correct location
- Server returns 503 with clear message if unreachable

### "Missing PINECONE_API_KEY"
- Set real value in `server/.env` from https://app.pinecone.io
- Verify it's exported: `echo $PINECONE_API_KEY`

### Model dropdown empty
- Ensure Ollama is running and has models
- Check: `curl http://localhost:11434/api/tags`
- Pull model if needed: `ollama pull gemma4:12b`

---

## Performance Tuning

### Rate Limiting
Adjust based on expected load:
```env
RATE_LIMIT_MAX=100           # Requests per window
RATE_LIMIT_WINDOW_MS=60000   # 60 seconds
```

### Ollama Configuration
For production, run Ollama with more memory/CPU:
```bash
# CPU threads
ollama serve --num-thread 8

# Or via environment
export OLLAMA_NUM_THREAD=8
ollama serve
```

### Server
Use a process manager (PM2, systemd, etc.):
```bash
pm2 start server/index.js --name "agentic-api"
pm2 save
```

---

## Monitoring

### Health Checks
```bash
# Check server is running
curl http://localhost:3001/healthz

# Check Ollama is running
curl http://localhost:11434/api/tags
```

### Logs
Server logs all requests via Morgan and errors via centralized error handler.

**Development:**
```bash
npm run dev:server
# Logs to console
```

**Production:**
Redirect stdout/stderr to logging service:
```bash
node index.js >> /var/log/agentic-api.log 2>&1 &
```

---

## Security Checklist

- [ ] Set strong `API_KEY` in production
- [ ] Restrict `CORS_ORIGIN` to your domain
- [ ] Use HTTPS in production (reverse proxy)
- [ ] Rotate Pinecone API keys regularly
- [ ] Restrict Ollama network access (use private network)
- [ ] Monitor rate limiting logs for abuse
- [ ] Keep dependencies updated: `npm audit fix`

---

**Last Updated:** 2026-09-26
