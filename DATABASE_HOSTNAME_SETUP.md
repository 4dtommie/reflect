# Database Hostname and Port Setup Guide

## Overview
Set up hostnames for your databases and configure ports to avoid conflicts with immich PostgreSQL.

## Current Port Configuration

| Service | Current Port | Recommended Port | Reason |
|---------|-------------|------------------|--------|
| Immich PostgreSQL | 5432 | 5432 | Keep as-is |
| Production Database | 5432 | **5434** | Avoid conflict with immich |
| Acceptance Database | 5433 | 5433 | Already different, keep as-is |

## Step 1: Update Docker Compose Configuration

**Update `docker-compose.yml` on your server:**

```yaml
postgres-prod:
  ports:
    - "${POSTGRES_PORT_PROD:-5434}:5432"  # Changed from 5432 to 5434
```

**Update `.env` file on your server:**

```env
# Production Database
POSTGRES_PORT_PROD=5434  # Changed from 5432

# Acceptance Database (optional hostname setup)
POSTGRES_PORT_ACC=5433
```

**Restart the production database:**
```bash
docker-compose down postgres-prod
docker-compose up -d postgres-prod
```

## Step 2: Set Up DNS Records

**In your domain's DNS settings, add:**

### Production Database Hostname (Recommended)
```
Type: A
Name: reflectie-db-prod
Value: YOUR_SERVER_IP
TTL: 3600 (or Auto)
```

**Result:** `reflectie-db-prod.yourdomain.com` → Your server IP

### Acceptance Database Hostname (Optional)
```
Type: A
Name: reflectie-db-acc
Value: YOUR_SERVER_IP
TTL: 3600 (or Auto)
```

**Result:** `reflectie-db-acc.yourdomain.com` → Your server IP

**Note:** If you don't want a hostname for acceptance, you can skip this and continue using IP:port.

## Step 3: Update Connection Strings

### For Production (Vercel Environment Variables)

**Using Hostname (Recommended):**
```
DATABASE_URL=postgresql://reflectie_user:YOUR_PASSWORD@reflectie-db-prod.yourdomain.com:5434/reflectie_prod?sslmode=require
```

**Using IP Address (Alternative):**
```
DATABASE_URL=postgresql://reflectie_user:YOUR_PASSWORD@YOUR_SERVER_IP:5434/reflectie_prod?sslmode=require
```

### For Local Development

**Update your local `.env` file:**

**Using Hostname:**
```
DATABASE_URL=postgresql://reflectie_user:YOUR_PASSWORD@reflectie-db-acc.yourdomain.com:5433/reflectie_acc
DATABASE_URL_ACC=postgresql://reflectie_user:YOUR_PASSWORD@reflectie-db-acc.yourdomain.com:5433/reflectie_acc
DATABASE_URL_PROD=postgresql://reflectie_user:YOUR_PASSWORD@reflectie-db-prod.yourdomain.com:5434/reflectie_prod?sslmode=require
DATABASE_ENV=acc
```

**Using IP Address:**
```
DATABASE_URL=postgresql://reflectie_user:YOUR_PASSWORD@YOUR_SERVER_IP:5433/reflectie_acc
DATABASE_URL_ACC=postgresql://reflectie_user:YOUR_PASSWORD@YOUR_SERVER_IP:5433/reflectie_acc
DATABASE_URL_PROD=postgresql://reflectie_user:YOUR_PASSWORD@YOUR_SERVER_IP:5434/reflectie_prod?sslmode=require
DATABASE_ENV=acc
```

## Step 4: Test Connections

**Test production database connection:**
```bash
# Using hostname
psql postgresql://reflectie_user:YOUR_PASSWORD@reflectie-db-prod.yourdomain.com:5434/reflectie_prod

# Using IP
psql postgresql://reflectie_user:YOUR_PASSWORD@YOUR_SERVER_IP:5434/reflectie_prod
```

**Test acceptance database connection:**
```bash
# Using hostname
psql postgresql://reflectie_user:YOUR_PASSWORD@reflectie-db-acc.yourdomain.com:5433/reflectie_acc

# Using IP
psql postgresql://reflectie_user:YOUR_PASSWORD@YOUR_SERVER_IP:5433/reflectie_acc
```

## Step 5: Update Firewall Rules

**If using a firewall, ensure port 5434 is open:**

```bash
# Example for UFW (Ubuntu)
sudo ufw allow 5434/tcp

# Example for Windows Firewall
# Add inbound rule for port 5434
```

## Benefits of Using Hostnames

✅ **Easier Management:**
- Change server IP without updating all connection strings
- More readable and professional

✅ **SSL Certificates:**
- Can use SSL certificates with hostnames
- Better security validation

✅ **Flexibility:**
- Can point to different servers later
- Easier to migrate databases

✅ **Organization:**
- Clear separation: `reflectie-db-prod` vs `reflectie-db-acc`
- Self-documenting setup
- Reflects project name

## Port Summary

| Database | Port | Hostname | Use Case |
|----------|------|----------|----------|
| Production | 5434 | `reflectie-db-prod.yourdomain.com` | Vercel deployment |
| Acceptance | 5433 | `reflectie-db-acc.yourdomain.com` (optional) | Local development |
| Immich | 5432 | (internal) | Immich service only |

## Quick Reference

**Production Connection String:**
```
postgresql://reflectie_user:PASSWORD@reflectie-db-prod.yourdomain.com:5434/reflectie_prod?sslmode=require
```

**Acceptance Connection String:**
```
postgresql://reflectie_user:PASSWORD@reflectie-db-acc.yourdomain.com:5433/reflectie_acc
```

**Or with IP:**
```
postgresql://reflectie_user:PASSWORD@YOUR_SERVER_IP:5434/reflectie_prod?sslmode=require
```

