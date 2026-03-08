FROM node:22-alpine

WORKDIR /usr/src/app

COPY ui/package*.json ./
RUN npm install --include=dev --cache /tmp/npm_cache

COPY ui/ .

# Expose the Vite dev server port
EXPOSE 9090

# Vite host must be set to allow external access (from Nginx)
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "9090"]
