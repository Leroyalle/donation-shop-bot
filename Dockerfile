FROM node:20-alpine AS base

WORKDIR /app

FROM base AS deps

COPY package.json package-lock.json* ./

RUN npm install --legacy-peer-deps

COPY . .

RUN npm run build

EXPOSE 3000
CMD ["node", "dist/main.js"]