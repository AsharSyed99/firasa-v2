FROM node:20-slim

WORKDIR /app

# Copy monorepo root files
COPY package.json package-lock.json turbo.json ./

# Copy relevant packages
COPY apps/api/ apps/api/
COPY packages/shared/ packages/shared/
COPY packages/database/ packages/database/
COPY packages/tsconfig/ packages/tsconfig/

# Install dependencies
RUN npm install --production=false

# Generate Prisma client
RUN cd packages/database && npx prisma generate

# Build shared package + API
RUN npx turbo build --filter=@firasa/api

# Create data directory for SQLite (ephemeral on free tier)
RUN mkdir -p /app/data

EXPOSE 3010

ENV NODE_ENV=production
ENV DATABASE_URL=file:/app/data/firasa.db

# Run Prisma migrate + start
CMD ["sh", "-c", "cd packages/database && DATABASE_URL=file:/app/data/firasa.db npx prisma db push --skip-generate && cd /app && node apps/api/dist/index.js"]
