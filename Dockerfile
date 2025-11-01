FROM node:25-slim
WORKDIR /usr/src/app

# Install curl for health checks
RUN apt-get update && apt-get install -y --no-install-recommends curl && rm -rf /var/lib/apt/lists/*

COPY package.json ./
RUN yarn install --frozen-lockfile

COPY . ./
RUN yarn build

EXPOSE 3000
CMD [ "yarn", "start:prod" ]
