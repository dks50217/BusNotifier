# Stage 1 — build
FROM node:18-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

ARG VITE_USE_MOCK=true
ARG VITE_TDX_CLIENT_ID
ARG VITE_TDX_CLIENT_SECRET
ENV VITE_USE_MOCK=$VITE_USE_MOCK
ENV VITE_TDX_CLIENT_ID=$VITE_TDX_CLIENT_ID
ENV VITE_TDX_CLIENT_SECRET=$VITE_TDX_CLIENT_SECRET

RUN npm run build

# Stage 2 — serve
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 80
