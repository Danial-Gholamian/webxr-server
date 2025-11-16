# syntax = docker/dockerfile:1
ARG NODE_VERSION=22.11.0
FROM node:${NODE_VERSION}-slim AS base
WORKDIR /app
ENV NODE_ENV="production"

# Build stage
FROM base AS build
RUN apt-get update -qq && \
    apt-get install --no-install-recommends -y \
    build-essential \
    node-gyp \
    pkg-config \
    python-is-python3

COPY package*.json ./
RUN npm ci
COPY . .  
# This copies index.js

# Final stage
FROM base
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/index.js .
COPY --from=build /app/package.json .

EXPOSE 3000
CMD ["node", "index.js"]