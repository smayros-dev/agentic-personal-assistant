#!/bin/sh
# Ollama startup script to ensure models are pulled

echo "🧠 Ollama startup script"
echo "Waiting for Ollama to be ready..."

# Wait for Ollama to respond
for i in $(seq 1 30); do
  if curl -s http://localhost:11434/api/tags > /dev/null; then
    echo "✓ Ollama is ready"
    break
  fi
  echo "  Attempt $i/30..."
  sleep 2
done

# Pull embedding model if not present
echo "📥 Checking for embedding model: nomic-embed-text"
if ! ollama list | grep -q "nomic-embed-text"; then
  echo "  Pulling nomic-embed-text (this may take 5-10 minutes on first run)..."
  ollama pull nomic-embed-text
else
  echo "  ✓ nomic-embed-text already available"
fi

# Pull main LLM model if not present (optional, for chat)
echo "📥 Checking for LLM model: qwen2:7b"
if ! ollama list | grep -q "qwen2:7b"; then
  echo "  Pulling qwen2:7b (this may take 10+ minutes on first run)..."
  ollama pull qwen2:7b
else
  echo "  ✓ qwen2:7b already available"
fi

echo "✅ Ollama initialization complete!"

# Keep container running
tail -f /dev/null
