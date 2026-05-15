# syntax=docker/dockerfile:1

FROM node:22-alpine AS frontend-build
WORKDIR /app/frontend
COPY frontend/package.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

FROM node:22-alpine AS server-build
WORKDIR /app/server
COPY server/package.json ./
RUN npm install
COPY server/ ./
RUN npm run build

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=8080
ENV DATA_DIR=/data
ENV STATIC_DIR=/app/static

COPY server/package.json ./
RUN npm install --omit=dev && npm cache clean --force

COPY --from=server-build /app/server/dist ./dist
COPY --from=frontend-build /app/frontend/dist ./static

EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||8080)+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "dist/index.js"]
