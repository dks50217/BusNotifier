# Stage 1 — build React frontend
FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

ARG VITE_USE_MOCK=false
ARG VITE_TDX_CLIENT_ID
ARG VITE_TDX_CLIENT_SECRET
ENV VITE_USE_MOCK=$VITE_USE_MOCK
ENV VITE_TDX_CLIENT_ID=$VITE_TDX_CLIENT_ID
ENV VITE_TDX_CLIENT_SECRET=$VITE_TDX_CLIENT_SECRET

RUN npm run build

# Stage 2 — runtime (Express server + LINE Bot)
FROM node:20-alpine
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY server/ ./server/
COPY src/types/ ./src/types/

COPY --from=builder /app/dist ./dist

EXPOSE 3000

CMD ["node", "--import", "tsx/esm", "server/index.ts"]
