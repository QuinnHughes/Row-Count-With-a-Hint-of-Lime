#############################################
# Lean multi-stage build (no root workspace) #
#############################################

# ---------- Client build ----------
FROM node:20-alpine AS client-build
WORKDIR /client
COPY client/package.json client/package-lock.json* ./
RUN npm install
COPY client/ .
RUN npm run build

# ---------- Server build ----------
FROM node:20-alpine AS server-build
WORKDIR /server
COPY server/package.json server/package-lock.json* ./
RUN npm install
COPY server/ .
RUN npm run build
# Prune dev deps AFTER build so dist keeps working
RUN npm prune --omit=dev || true

# ---------- Runtime ----------
FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=8080
# Copy server runtime assets
COPY --from=server-build /server/dist ./server/dist
COPY --from=server-build /server/package.json ./server/package.json
COPY --from=server-build /server/node_modules ./server/node_modules
# Copy built client
COPY --from=client-build /client/dist ./client/dist
# Ensure data file & create unprivileged user
RUN adduser -D app && touch /app/data.json && chown -R app:app /app
USER app
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 CMD wget -qO- http://localhost:8080/api/health || exit 1
CMD ["node", "server/dist/index.js"]
