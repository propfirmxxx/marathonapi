### Multi-stage Dockerfile for MarathonAPI (NestJS + TypeScript)
### Stage 1: build
FROM node:18-alpine AS builder
WORKDIR /usr/src/app

# Install build dependencies
COPY package.json yarn.lock ./
RUN apk add --no-cache python3 make g++ \
	&& yarn install --frozen-lockfile --production=false \
	&& yarn cache clean

# Copy source and build
COPY . .
RUN yarn build

### Stage 2: production image
FROM node:18-alpine AS runner
WORKDIR /usr/src/app

# Install only production deps
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile --production=true && yarn cache clean

# Copy built files and other runtime assets
COPY --from=builder /usr/src/app/dist ./dist
COPY --from=builder /usr/src/app/public ./public
COPY --from=builder /usr/src/app/uploads ./uploads

# Copy any other needed files (env example, migrations, etc.)
COPY --from=builder /usr/src/app/ormconfig.js ./ormconfig.js
COPY --from=builder /usr/src/app/package.json ./package.json

ENV NODE_ENV=production
ENV PORT=3000

# Expose the port the app listens on
EXPOSE 3000

# Use module-alias/register so runtime path aliases (@/*) resolve to dist
CMD ["node", "-r", "module-alias/register", "dist/main"]