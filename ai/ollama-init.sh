#!/bin/sh
set -eu

echo "Starting Ollama on ${OLLAMA_HOST:-0.0.0.0:9094}..."
ollama serve &
OLLAMA_PID=$!

cleanup() {
  kill "$OLLAMA_PID" 2>/dev/null || true
}

trap cleanup INT TERM EXIT

echo "Waiting for Ollama API..."
until ollama list >/dev/null 2>&1; do
  sleep 2
done

for model in \
  "nomic-embed-text:latest" \
  "llama3.2:latest" \
  "lfm2.5-thinking:latest" \
  "granite4:latest"
do
  echo "Pulling ${model}..."
  ollama pull "${model}"
done

echo "Ollama bootstrap complete."
wait "$OLLAMA_PID"
