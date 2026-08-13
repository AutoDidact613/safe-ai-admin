# syntax=docker/dockerfile:1

FROM node:20-alpine AS build
ARG VITE_API_URL=/api
ARG VITE_BASE_PATH=/
ENV VITE_API_URL=${VITE_API_URL}
ENV VITE_BASE_PATH=${VITE_BASE_PATH}
WORKDIR /app
COPY apps/client/package*.json ./
RUN npm ci
COPY apps/client/ ./
RUN npm run build

FROM nginx:1.27-alpine
ARG VITE_BASE_PATH=/
ENV VITE_BASE_PATH=${VITE_BASE_PATH}
COPY infra/docker/nginx/nginx.conf.template /etc/nginx/conf.d/default.conf.template
# Restricting envsubst to just $VITE_BASE_PATH keeps nginx's own runtime
# variables (like $uri, $host) — which use the same ${...} syntax — untouched.
RUN apk add --no-cache gettext \
  && envsubst '${VITE_BASE_PATH}' < /etc/nginx/conf.d/default.conf.template > /etc/nginx/conf.d/default.conf \
  && rm /etc/nginx/conf.d/default.conf.template \
  && apk del gettext
# The Vite build only bakes VITE_BASE_PATH into asset URLs inside index.html —
# it does not move dist/ on disk. Serving under a sub-path (e.g. /console/)
# means the physical files must live under that same sub-path on the nginx
# filesystem too, so nginx.conf's `root` lines up with the URLs the app requests.
COPY --from=build /app/dist /usr/share/nginx/html${VITE_BASE_PATH}

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -q -O- http://localhost/healthz || exit 1

EXPOSE 80
