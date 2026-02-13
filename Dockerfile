# Build stage
FROM node:18-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# Production stage
FROM node:18-alpine AS runner

LABEL org.opencontainers.image.source="https://github.com/Ralve-org/RabbitScout" \
      org.opencontainers.image.description="Modern RabbitMQ management dashboard" \
      org.opencontainers.image.licenses="MIT"

WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 3000
CMD ["node", "server.js"]
