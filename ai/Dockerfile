FROM ollama/ollama:latest

COPY ollama-init.sh /usr/local/bin/ollama-init.sh
RUN chmod +x /usr/local/bin/ollama-init.sh

ENTRYPOINT ["/bin/sh", "/usr/local/bin/ollama-init.sh"]
