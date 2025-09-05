# Multi-stage build: development (with hot reload) & production

FROM node:20-alpine AS base
WORKDIR /workspace
# Copy root and workspace manifests only (add lockfile later for repeatable builds)
COPY package.json ./
COPY server/package.json server/package.json
COPY client/package.json client/package.json
RUN apk add --no-cache python3 make g++ \
	&& npm install --include-workspace-root

FROM base AS development
COPY . .
EXPOSE 8080 5173
CMD ["npm", "run", "dev"]

FROM base AS build
COPY . .
RUN npm run build

FROM node:20-alpine AS production
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=8080
COPY --from=build /workspace/server/dist ./server/dist
COPY --from=build /workspace/client/dist ./client/dist
COPY --from=base /workspace/server/node_modules ./server/node_modules
COPY --from=base /workspace/package.json ./package.json
COPY --from=base /workspace/server/package.json ./server/package.json
EXPOSE 8080
CMD ["node", "server/dist/index.js"]
