FROM registry.redhat.io/ubi9/nodejs-22-minimal:latest

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

ENV NODE_ENV=production
USER 1001
EXPOSE 4000

CMD ["npm", "start"]
