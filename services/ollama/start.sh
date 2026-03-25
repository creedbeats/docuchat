#!/bin/sh

# Start the Ollama server in the background
ollama serve &

# Wait for it to be ready
echo "Waiting for Ollama server to start..."
until ollama list >/dev/null 2>&1; do
  sleep 1
done

# Pull the model if not already present
echo "Pulling model: ${OLLAMA_MODEL:-mistral}..."
ollama pull "${OLLAMA_MODEL:-mistral}"

echo "Ollama ready with model: ${OLLAMA_MODEL:-mistral}"

# Keep the server in the foreground
wait
