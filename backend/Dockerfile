# ---- Étape 1 : installation des dépendances ----
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev

# ---- Étape 2 : image finale, minimale ----
FROM node:20-alpine AS runner
WORKDIR /app

RUN addgroup -g 1001 -S nodejs && adduser -S nodeuser -u 1001

COPY --from=deps /app/node_modules ./node_modules
COPY package*.json ./
COPY src ./src

USER nodeuser

ENV NODE_ENV=production
ENV PORT=4000

EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:4000/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1))"

CMD ["node", "src/server.js"]
