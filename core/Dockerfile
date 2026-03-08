FROM node:22-alpine

# Use /usr/src/app as the root of the project inside the container
WORKDIR /usr/src/app

# 1. Install dependencies for the 'core' app
COPY core/package*.json ./core/
RUN cd core && npm install --include=dev --cache /tmp/npm_cache

# 2. Copy the 'core' sources
COPY core/ ./core/

# 3. Copy the framework libraries (source of truth)
COPY standards-library/ ./standards-library/
COPY profiles/ ./profiles/
COPY spec-templates/ ./spec-templates/
COPY workflows/ ./workflows/
COPY standards-registry/ ./standards-registry/
# 4. Set working dir to the core logic for execution
WORKDIR /usr/src/app/core

EXPOSE 9091

CMD ["npm", "run", "dev"]
