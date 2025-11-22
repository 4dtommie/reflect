# Docker Self-Hosting Guide

## Overview
Self-host your Reflectie AI application using Docker instead of Vercel. This allows you to run everything on your own server.

## What You Need

1. **Docker and Docker Compose** (already installed)
2. **Node.js adapter** for SvelteKit (instead of Vercel adapter)
3. **Dockerfile** to build and run the app
4. **Updated docker-compose.yml** to include the app
5. **Environment variables** configuration

## Step 1: Install Node Adapter

**Install the Node adapter:**
```bash
npm install -D @sveltejs/adapter-node
```

## Step 2: Update SvelteKit Configuration

**Update `svelte.config.js`:**

Change from:
```js
import adapter from '@sveltejs/adapter-vercel';
```

To:
```js
import adapter from '@sveltejs/adapter-node';
```

## Step 3: Create Dockerfile

**Create `Dockerfile`:**

```dockerfile
# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies
RUN npm ci

# Generate Prisma Client
RUN npx prisma generate

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install production dependencies only
RUN npm ci --only=production

# Generate Prisma Client (needed at runtime)
RUN npx prisma generate

# Copy built application from builder
COPY --from=builder /app/build ./build
COPY --from=builder /app/.svelte-kit ./.svelte-kit
COPY --from=builder /app/package.json ./

# Expose port
EXPOSE 3000

# Set environment to production
ENV NODE_ENV=production

# Run migrations and start server
CMD ["sh", "-c", "npx prisma migrate deploy && node build"]
```

## Step 4: Create .dockerignore

**Create `.dockerignore`:**

```
node_modules
.svelte-kit
.env
.env.*
!.env.example
.git
.gitignore
*.md
.vscode
.idea
dist
build
.output
.vercel
.netlify
```

## Step 5: Update Docker Compose

**Update `docker-compose.yml` to include the app:**

```yaml
version: '3.8'

services:
  # Your existing databases
  postgres-acc:
    # ... existing config ...

  postgres-prod:
    # ... existing config ...

  # Add the application
  reflectie-app:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: reflectie-app
    restart: unless-stopped
    ports:
      - "${APP_PORT:-3000}:3000"
    environment:
      DATABASE_URL: ${DATABASE_URL_PROD}
      DATABASE_ENV: ${DATABASE_ENV:-prod}
      NODE_ENV: production
    depends_on:
      postgres-prod:
        condition: service_healthy
    networks:
      - postgres-network
    volumes:
      # Optional: Mount .env file if you want to override
      # - ./.env:/app/.env:ro

networks:
  postgres-network:
    driver: bridge
```

## Step 6: Update Environment Variables

**Update your `.env` file (or docker-compose.env):**

```env
# App Configuration
APP_PORT=3000
NODE_ENV=production
DATABASE_ENV=prod

# Database URLs (use container names for internal communication)
DATABASE_URL=postgresql://reflectie_user:YOUR_PASSWORD@postgres-prod:5432/reflectie_prod
DATABASE_URL_PROD=postgresql://reflectie_user:YOUR_PASSWORD@postgres-prod:5432/reflectie_prod
DATABASE_URL_ACC=postgresql://reflectie_user:YOUR_PASSWORD@postgres-acc:5432/reflectie_acc

# Database Configuration (existing)
POSTGRES_USER_PROD=reflectie_user
POSTGRES_PASSWORD_PROD=your_password
POSTGRES_DB_PROD=reflectie_prod
POSTGRES_PORT_PROD=5432
```

**Note:** When using Docker Compose, you can use container names (like `postgres-prod`) instead of hostnames for internal communication.

## Step 7: Get Project Files on Server

**You have several options:**

### Option A: Git Clone on Server (Recommended)

**On your server:**
```bash
# Clone your repository
git clone https://github.com/yourusername/reflectie-ai.git
cd reflectie-ai

# Or if using SSH
git clone git@github.com:yourusername/reflectie-ai.git
cd reflectie-ai
```

**Then build from the cloned directory:**
```bash
docker-compose -f docker-compose.app.yml build
docker-compose -f docker-compose.app.yml up -d
```

### Option B: Copy Files to Server

**From your local machine:**
```bash
# Using SCP
scp -r . user@your-server:/path/to/reflectie-ai/

# Or using rsync (better for updates)
rsync -avz --exclude 'node_modules' --exclude '.svelte-kit' . user@your-server:/path/to/reflectie-ai/
```

### Option C: Build Image Locally and Push to Registry

**Build and push to Docker Hub or private registry:**
```bash
# Build image
docker build -t yourusername/reflectie-ai:latest .

# Push to registry
docker push yourusername/reflectie-ai:latest
```

**On server, update docker-compose to use the image:**
```yaml
reflectie-app:
  image: yourusername/reflectie-ai:latest
  # ... rest of config
```

### Option D: CI/CD Pipeline

**Set up GitHub Actions / GitLab CI to:**
1. Build Docker image on push
2. Push to registry
3. Deploy to your server (or server pulls latest)

## Step 8: Build and Run

**After getting files on server, build and start:**
```bash
# Build the application
docker-compose -f docker-compose.app.yml build reflectie-app

# Start everything
docker-compose -f docker-compose.app.yml up -d

# Or build and start in one command
docker-compose -f docker-compose.app.yml up -d --build
```

**View logs:**
```bash
docker-compose logs -f reflectie-app
```

**Stop:**
```bash
docker-compose down
```

## Step 8: Set Up Reverse Proxy (Nginx Proxy Manager)

**Add the app to Nginx Proxy Manager:**

1. Go to Nginx Proxy Manager
2. Add Proxy Host (HTTP, not Stream)
3. **Domain:** `reflectie.ontwerpkracht.nl` (or your domain)
4. **Forward Hostname:** `reflectie-app` (container name) or `localhost`
5. **Forward Port:** `3000`
6. **SSL:** Enable SSL certificate (Let's Encrypt)
7. Save

**DNS:**
- Add A record: `reflectie.ontwerpkracht.nl` → Your server IP

## Alternative: Simple Dockerfile (Single Stage)

**If you prefer a simpler setup:**

```dockerfile
FROM node:20-alpine

WORKDIR /app

# Copy everything
COPY . .

# Install dependencies
RUN npm ci

# Generate Prisma Client
RUN npx prisma generate

# Build application
RUN npm run build

# Expose port
EXPOSE 3000

# Run migrations and start
CMD ["sh", "-c", "npx prisma migrate deploy && node build"]
```

## Environment Variables in Docker

**Option 1: Environment file**
```bash
docker-compose --env-file .env up -d
```

**Option 2: Docker Compose environment**
```yaml
environment:
  DATABASE_URL: postgresql://user:pass@postgres-prod:5432/db
  NODE_ENV: production
```

**Option 3: .env file (auto-loaded by docker-compose)**
- Create `.env` file in same directory as `docker-compose.yml`
- Docker Compose automatically loads it

## Updating the Application

**When you make changes, you need to update the code on the server first:**

### If Using Git Clone (Recommended):

```bash
# On your server
cd /path/to/reflectie-ai

# Pull latest changes
git pull

# Rebuild and restart
docker-compose -f docker-compose.app.yml up -d --build reflectie-app
```

### If Using File Copy:

```bash
# From your local machine, sync files
rsync -avz --exclude 'node_modules' --exclude '.svelte-kit' . user@server:/path/to/reflectie-ai/

# On server, rebuild
docker-compose -f docker-compose.app.yml up -d --build reflectie-app
```

### If Using Docker Registry:

```bash
# On your server
docker-compose -f docker-compose.app.yml pull reflectie-app
docker-compose -f docker-compose.app.yml up -d reflectie-app
```

## Database Migrations

**Migrations run automatically on container start** (see Dockerfile CMD).

**To run migrations manually:**
```bash
docker exec reflectie-app npx prisma migrate deploy
```

## Monitoring

**Check container status:**
```bash
docker-compose ps
```

**View logs:**
```bash
docker-compose logs -f reflectie-app
```

**Check resource usage:**
```bash
docker stats reflectie-app
```

## Backup Strategy

**Backup database:**
```bash
docker exec postgres-prod pg_dump -U reflectie_user reflectie_prod > backup-$(date +%Y%m%d).sql
```

**Backup application data:**
- Database backups (above)
- Environment variables (`.env` file)
- Docker volumes (if any)

## Comparison: Vercel vs Self-Hosted

| Feature | Vercel | Self-Hosted Docker |
|---------|--------|-------------------|
| Setup Complexity | Easy | Medium |
| Cost | Free tier available | Server costs |
| Auto-deploy | Yes (Git push) | Manual or CI/CD |
| Scaling | Automatic | Manual |
| Control | Limited | Full |
| Maintenance | None | You manage |
| SSL | Automatic | Manual (Nginx Proxy Manager) |

## Quick Start Commands

```bash
# Build and start
docker-compose up -d --build

# View logs
docker-compose logs -f reflectie-app

# Stop
docker-compose down

# Restart
docker-compose restart reflectie-app

# Update and redeploy
docker-compose build reflectie-app
docker-compose up -d reflectie-app
```

## Troubleshooting

**App won't start:**
- Check logs: `docker-compose logs reflectie-app`
- Verify database is running: `docker-compose ps`
- Check environment variables are set

**Can't connect to database:**
- Ensure containers are on same network
- Use container names in connection strings
- Check database is healthy: `docker-compose ps`

**Port conflicts:**
- Change `APP_PORT` in `.env` if port 3000 is in use
- Update docker-compose.yml port mapping

## Next Steps

1. Install `@sveltejs/adapter-node`
2. Update `svelte.config.js`
3. Create `Dockerfile`
4. Update `docker-compose.yml`
5. Build and run!

