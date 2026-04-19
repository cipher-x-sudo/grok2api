# Build stage
FROM node:20-slim AS builder

ARG VITE_API_KEY
ARG VITE_ADMIN_KEY
ENV VITE_API_KEY=$VITE_API_KEY
ENV VITE_ADMIN_KEY=$VITE_ADMIN_KEY

WORKDIR /app
# Intentionally copy only package.json to avoid package-lock.json optional dependency issues across OSes
COPY package.json ./
RUN npm install
COPY . .
RUN npx vite build

# Production stage
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
