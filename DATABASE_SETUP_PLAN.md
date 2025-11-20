# PostgreSQL Database Setup Plan

## Overview
This plan outlines the setup for PostgreSQL database integration with separate acceptance (acc) and production (prod) environments.

## Architecture

### Database Instances
- **Acceptance (acc)**: Staging/testing environment
- **Production (prod)**: Live environment
- Both running on your own server via Docker containers

### Table Structure (Prisma Schema)
```prisma
model Person {
  id        Int      @id @default(autoincrement())
  name      String
  age       Int
  city      String
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  @@map("people")
}
```

## Implementation Steps

### 0. Docker PostgreSQL Setup (Home Server)

#### Prerequisites
- Docker and Docker Compose installed on your home server
- Network access to your server (for remote connections)

#### Docker Compose Configuration

Create `docker-compose.yml` on your home server:

```yaml
version: '3.8'

services:
  postgres-acc:
    image: postgres:16-alpine
    container_name: postgres-acc
    restart: unless-stopped
    environment:
      POSTGRES_USER: ${POSTGRES_USER_ACC:-reflectie_user}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD_ACC}
      POSTGRES_DB: ${POSTGRES_DB_ACC:-reflectie_acc}
      PGDATA: /var/lib/postgresql/data/pgdata
    ports:
      - "${POSTGRES_PORT_ACC:-5433}:5432"  # Use 5433 to avoid conflict with prod
    volumes:
      - postgres-acc-data:/var/lib/postgresql/data
    networks:
      - postgres-network
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER_ACC:-reflectie_user}"]
      interval: 10s
      timeout: 5s
      retries: 5

  postgres-prod:
    image: postgres:16-alpine
    container_name: postgres-prod
    restart: unless-stopped
    environment:
      POSTGRES_USER: ${POSTGRES_USER_PROD:-reflectie_user}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD_PROD}
      POSTGRES_DB: ${POSTGRES_DB_PROD:-reflectie_prod}
      PGDATA: /var/lib/postgresql/data/pgdata
    ports:
      - "${POSTGRES_PORT_PROD:-5432}:5432"  # Standard PostgreSQL port
    volumes:
      - postgres-prod-data:/var/lib/postgresql/data
    networks:
      - postgres-network
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER_PROD:-reflectie_user}"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  postgres-acc-data:
    driver: local
  postgres-prod-data:
    driver: local

networks:
  postgres-network:
    driver: bridge
```

#### Environment File for Docker

Create `.env` file on your server (in same directory as docker-compose.yml):

```env
# Acceptance Database
POSTGRES_USER_ACC=reflectie_user
POSTGRES_PASSWORD_ACC=your_secure_password_here
POSTGRES_DB_ACC=reflectie_acc
POSTGRES_PORT_ACC=5433

# Production Database
POSTGRES_USER_PROD=reflectie_user
POSTGRES_PASSWORD_PROD=your_different_secure_password_here
POSTGRES_DB_PROD=reflectie_prod
POSTGRES_PORT_PROD=5432
```

**Security Note:** Add `.env` to `.gitignore` if version controlling your server setup.

#### Starting the Databases

```bash
# Start both databases
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f postgres-acc
docker-compose logs -f postgres-prod

# Stop databases
docker-compose down

# Stop and remove volumes (⚠️ deletes all data)
docker-compose down -v
```

#### Connection Strings

After starting, your connection strings will be:

**Acceptance:**
```
postgresql://reflectie_user:your_secure_password_here@your_server_ip:5433/reflectie_acc
```

**Production:**
```
postgresql://reflectie_user:your_different_secure_password_here@your_server_ip:5432/reflectie_prod
```

#### Network Access Configuration

**For Remote Access (from your dev machine):**

1. **Firewall:** Open ports 5432 and 5433 on your server
2. **PostgreSQL Config:** The Docker image uses default settings that allow connections
3. **Security:** Consider using:
   - VPN for secure access
   - SSH tunnel for development
   - IP whitelisting in firewall
   - SSL connections (add `?sslmode=require` to connection string)

**SSH Tunnel Example (Secure):**
```bash
# Create SSH tunnel for acceptance DB
ssh -L 5433:localhost:5433 user@your_server_ip

# Then connect using:
# postgresql://reflectie_user:password@localhost:5433/reflectie_acc
```

#### Docker Compose Best Practices

1. **Separate Volumes:** Each database has its own volume for data persistence
2. **Health Checks:** Ensures containers are ready before connections
3. **Restart Policy:** `unless-stopped` keeps databases running after server reboot
4. **Network Isolation:** Both databases on same network for potential future services
5. **Port Mapping:** Different ports prevent conflicts (5433 for acc, 5432 for prod)
6. **Alpine Images:** Smaller, more secure base images

#### Backup Strategy

Add to your server maintenance routine:

```bash
# Backup acceptance database
docker exec postgres-acc pg_dump -U reflectie_user reflectie_acc > backup-acc-$(date +%Y%m%d).sql

# Backup production database
docker exec postgres-prod pg_dump -U reflectie_user reflectie_prod > backup-prod-$(date +%Y%m%d).sql
```

#### Monitoring

```bash
# Check database sizes
docker exec postgres-acc psql -U reflectie_user -d reflectie_acc -c "SELECT pg_size_pretty(pg_database_size('reflectie_acc'));"
docker exec postgres-prod psql -U reflectie_user -d reflectie_prod -c "SELECT pg_size_pretty(pg_database_size('reflectie_prod'));"

# Check active connections
docker exec postgres-acc psql -U reflectie_user -d reflectie_acc -c "SELECT count(*) FROM pg_stat_activity;"
```

### 1. Install Dependencies
```bash
npm install @prisma/client
npm install -D prisma
```

### 2. Initialize Prisma

```bash
npx prisma init
```

This creates:
- `prisma/schema.prisma` - Prisma schema file
- `.env` - Environment variables file

### 3. Environment Configuration

#### Update `.env` (created by Prisma init)
```env
# Prisma uses DATABASE_URL by default
# For local development, use acceptance database
DATABASE_URL=postgresql://user:password@host:5432/dbname_acc

# Optional: Separate URLs for different environments
DATABASE_URL_ACC=postgresql://user:password@host:5432/dbname_acc
DATABASE_URL_PROD=postgresql://user:password@host:5432/dbname_prod

# Environment (acc or prod)
NODE_ENV=development
DATABASE_ENV=acc
```

#### Create `.env.example`
```env
DATABASE_URL=postgresql://user:password@host:5432/dbname_acc
DATABASE_URL_ACC=postgresql://user:password@host:5432/dbname_acc
DATABASE_URL_PROD=postgresql://user:password@host:5432/dbname_prod
NODE_ENV=development
DATABASE_ENV=acc
```

**Note:** Prisma uses `DATABASE_URL` by default. We'll create a utility to switch between acc/prod based on `DATABASE_ENV`.

### 4. Prisma Schema Setup

**File: `prisma/schema.prisma`**
- Define the Person model
- Configure PostgreSQL provider
- Set up connection string

**Example:**
```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model Person {
  id        Int      @id @default(autoincrement())
  name      String
  age       Int
  city      String
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  @@map("people")
}
```

### 5. Database Connection Setup

**File: `src/lib/server/db/index.ts`**
- Create Prisma Client instance
- Handle both acc and prod connections based on `DATABASE_ENV`
- Export singleton instance to prevent multiple connections
- Use Prisma's built-in connection pooling

### 6. Database Migrations

**Run migrations:**
```bash
# Create migration
npx prisma migrate dev --name init

# Apply migrations to database
npx prisma migrate deploy
```

**Migration files:**
- Created automatically in `prisma/migrations/`
- Prisma tracks applied migrations automatically
- Can be version controlled

### 7. Seed Data

**File: `prisma/seed.ts`**
- Script to insert default data using Prisma Client
- Sample records matching current table structure

**Default Data:**
- John, 25, New York
- Jane, 30, Los Angeles
- (Add more as needed)

**Configure in `package.json`:**
```json
{
  "prisma": {
    "seed": "tsx prisma/seed.ts"
  }
}
```

**Default Data:**
- John, 25, New York
- Jane, 30, Los Angeles
- (Add more as needed)

### 8. Generate Prisma Client

After schema changes, always run:
```bash
npx prisma generate
```

This generates TypeScript types and the Prisma Client.

### 9. API Routes

**File: `src/routes/api/people/+server.ts`**
- GET endpoint to fetch all people
- Returns JSON array

**File: `src/routes/api/people/[id]/+server.ts`** (optional)
- GET endpoint for single person
- PUT/PATCH for updates
- DELETE for removal

### 10. Update Frontend

**File: `src/routes/+page.svelte`**
- Fetch data from API on page load
- Display data in table
- Handle loading and error states

### 11. NPM Scripts

Add to `package.json`:
```json
{
  "scripts": {
    "db:generate": "prisma generate",
    "db:migrate": "prisma migrate dev",
    "db:migrate:deploy": "prisma migrate deploy",
    "db:seed": "prisma db seed",
    "db:studio": "prisma studio",
    "db:reset": "prisma migrate reset",
    "db:push": "prisma db push"
  }
}
```

**Script explanations:**
- `db:generate` - Generate Prisma Client after schema changes
- `db:migrate` - Create and apply migrations (development)
- `db:migrate:deploy` - Apply migrations (production)
- `db:seed` - Run seed script
- `db:studio` - Open Prisma Studio (visual database browser)
- `db:reset` - Reset database and re-run migrations + seed
- `db:push` - Push schema changes without migrations (dev only)

## File Structure
```
prisma/
├── schema.prisma     # Prisma schema definition
├── seed.ts           # Seed data script
└── migrations/       # Auto-generated migration files
    └── [timestamp]_init/
        └── migration.sql

src/lib/server/db/
└── index.ts          # Prisma Client instance & utilities

src/routes/api/
└── people/
    ├── +server.ts    # GET all people
    └── [id]/
        └── +server.ts # Individual person operations
```

## Environment-Specific Configuration

### Development
- Uses `DATABASE_ENV=acc` from `.env`
- Sets `DATABASE_URL` to `DATABASE_URL_ACC`
- Connects to acceptance database
- Can use `prisma migrate dev` for development migrations

### Production
- Uses `DATABASE_ENV=prod` from environment variables
- Sets `DATABASE_URL` to `DATABASE_URL_PROD`
- Connects to production database
- Set via deployment platform (Vercel, etc.)
- Use `prisma migrate deploy` for production migrations (no prompts)

## Security Considerations

1. **Never commit `.env` files** (already in `.gitignore`)
2. **Prisma handles connection pooling** automatically
3. **Prisma uses parameterized queries** by default (prevents SQL injection)
4. **Environment variables** for all sensitive data
5. **SSL connections** - Add `?sslmode=require` to DATABASE_URL for production
6. **Prisma Client is type-safe** - Reduces runtime errors
7. **Never commit migration files with sensitive data** (they're SQL, review before committing)

## Deployment Checklist

- [ ] Set `DATABASE_URL_ACC` in acceptance environment
- [ ] Set `DATABASE_URL_PROD` in production environment
- [ ] Set `DATABASE_ENV` appropriately for each environment
- [ ] Run `prisma generate` in build process (or add to postinstall script)
- [ ] Run `prisma migrate deploy` on both databases (production-safe)
- [ ] Seed acceptance database (optional for prod)
- [ ] Test connections from deployed environment
- [ ] Ensure Prisma Client is generated in build step

## Next Steps

1. Install Prisma dependencies
2. Initialize Prisma (`npx prisma init`)
3. Configure Prisma schema (`prisma/schema.prisma`)
4. Set up environment variables
5. Create Prisma Client utility with acc/prod switching
6. Create and run migrations (`prisma migrate dev`)
7. Generate Prisma Client (`prisma generate`)
8. Create seed script (`prisma/seed.ts`)
9. Seed with default data (`prisma db seed`)
10. Create API endpoints using Prisma Client
11. Update frontend to use real data
12. Test with both acc and prod databases

## Prisma Benefits

- **Type Safety**: Auto-generated TypeScript types from schema
- **Migrations**: Built-in migration system with history tracking
- **Developer Experience**: Prisma Studio for visual database browsing
- **Query Builder**: Type-safe queries with autocomplete
- **Connection Pooling**: Handled automatically
- **SQL Injection Protection**: Parameterized queries by default

