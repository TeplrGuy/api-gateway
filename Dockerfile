FROM node:24-alpine

WORKDIR /app

COPY package*.json ./
ARG NPM_CONFIG_REGISTRY=https://registry.npmjs.org/
RUN npm ci --omit=dev --no-audit --no-fund

COPY src ./src

ENV PORT=3000
EXPOSE 3000

CMD ["npm", "start"]
