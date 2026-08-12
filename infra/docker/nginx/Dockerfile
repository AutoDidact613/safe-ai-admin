# syntax=docker/dockerfile:1

FROM node:20-alpine AS build
ARG VITE_API_URL=/api
ENV VITE_API_URL=${VITE_API_URL}
WORKDIR /app
COPY apps/client/package*.json ./
RUN npm ci
COPY apps/client/ ./
RUN npm run build

FROM nginx:1.27-alpine
COPY infra/docker/nginx/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -q -O- http://localhost/healthz || exit 1

EXPOSE 80
