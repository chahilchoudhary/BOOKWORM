FROM registry.redhat.io/ubi9/nodejs-22-minimal:latest AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

USER 1001
EXPOSE 5173

CMD ["npx", "vite", "preview", "--host", "127.0.0.1", "--port", "5173"]
