# -------- Stage 1: Dependencies --------
FROM node:25-slim AS deps
WORKDIR /app

COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile

# -------- Stage 2: Build --------
FROM node:25-slim AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN yarn build

# -------- Stage 3: Production --------
FROM node:25-slim

WORKDIR /app

RUN apt-get update
RUN apt-get install -y --no-install-recommends curl
RUN rm -rf /var/lib/apt/lists/*

COPY package.json yarn.lock ./
RUN yarn install --production --frozen-lockfile

COPY --from=builder /app/dist ./dist
EXPOSE 3000

CMD ["yarn", "start:prod"]