# Vercel Deployment Plan

## Overview
Deploy the Reflectie AI application to Vercel with:
- Automatic deployments on git push
- Database migrations running on deploy
- Production environment variables configured
- Prisma Client generation during build

## Prerequisites Checklist

- [x] Vercel adapter installed (`@sveltejs/adapter-vercel`)
- [x] SvelteKit configured with Vercel adapter
- [ ] Vercel account created
- [ ] Production database accessible from Vercel
- [ ] Git repository set up (GitHub, GitLab, or Bitbucket)
- [ ] Domain name registered
- [ ] Database server configured with hostname/domain
- [ ] Database ports configured (production on different port than immich)

## Step-by-Step Deployment Plan

### 1. Update Build Scripts

**Update `package.json` to ensure Prisma Client is generated during build:**

```json
{
  "scripts": {
    "build": "prisma generate && vite build",
    "postinstall": "prisma generate"
  }
}
```

**Why:**
- `postinstall` runs after `npm install` on Vercel, ensuring Prisma Client is generated
- `build` script includes `prisma generate` as a safety net

### 2. Create Vercel Configuration

**Create `vercel.json` (optional, for custom settings):**

```json
{
  "buildCommand": "npm run build",
  "installCommand": "npm install",
  "framework": "sveltekit",
  "regions": ["iad1"]
}
```

**Note:** Vercel auto-detects SvelteKit, so this file is optional unless you need custom settings.

### 3. Set Up Vercel Project

**Via Vercel Dashboard:**
1. Go to [vercel.com](https://vercel.com)
2. Sign in with GitHub/GitLab/Bitbucket
3. Click "Add New Project"
4. Import your repository
5. Vercel will auto-detect SvelteKit

**Via Vercel CLI (Alternative):**
```bash
npm install -g vercel
vercel login
vercel
```

### 4. Set Up Nginx Proxy Manager for PostgreSQL

**Why Use Nginx Proxy Manager:**
- ✅ SSL/TLS termination for secure connections
- ✅ Centralized management of database access
- ✅ Easier to change backend without updating connection strings
- ✅ Additional security layer
- ✅ Can add authentication/access control

**Configuration Steps:**

1. **Access Nginx Proxy Manager:**
   - Open Nginx Proxy Manager web interface
   - Default: `http://your-server-ip:81` or your configured domain

2. **Add Stream Proxy (TCP Proxy):**
   - Go to **Streams** tab (or **Proxy Hosts** → **Streams**)
   - Click **Add Stream Proxy**

3. **Configure Production Database Stream:**

   **Inbound:**
   - **Domain Name:** `reflectie-db-prod.yourdomain.com`
   - **Port:** `5434` (or your chosen port)
   - **Scheme:** `tcp`

   **Outbound:**
   - **Forward Hostname:** `localhost` (or Docker container name: `postgres-prod`)
   - **Forward Port:** `5432` (internal container port)
   - **Scheme:** `tcp`

   **SSL:**
   - Enable SSL if you want encrypted connections
   - Add SSL certificate for `reflectie-db-prod.yourdomain.com`
   - Or use Let's Encrypt certificate

4. **Configure Acceptance Database Stream (Optional):**

   **Inbound:**
   - **Domain Name:** `reflectie-db-acc.yourdomain.com`
   - **Port:** `5433` (or your chosen port)
   - **Scheme:** `tcp`

   **Outbound:**
   - **Forward Hostname:** `localhost` (or Docker container name: `postgres-acc`)
   - **Forward Port:** `5432` (internal container port)
   - **Scheme:** `tcp`

5. **Update DNS Records:**

   Point your DNS records to your Nginx Proxy Manager server:
   ```
   reflectie-db-prod.yourdomain.com    A    YOUR_NGINX_PROXY_MANAGER_IP
   reflectie-db-acc.yourdomain.com      A    YOUR_NGINX_PROXY_MANAGER_IP
   ```

6. **Configure Firewall:**

   Open the proxy ports on your firewall:
   ```bash
   # Allow port 5434 for production database
   sudo ufw allow 5434/tcp
   
   # Allow port 5433 for acceptance database (if using)
   sudo ufw allow 5433/tcp
   ```

**Important Notes:**
- Nginx Proxy Manager uses **Stream** proxies for TCP connections (PostgreSQL)
- This is different from HTTP proxies
- Ensure Nginx Proxy Manager has access to your Docker network
- If using Docker, you may need to connect Nginx Proxy Manager to the same network as PostgreSQL containers

**Connection String After Proxy Setup:**

The connection string remains the same, but now goes through the proxy:
```
postgresql://reflectie_user:PASSWORD@reflectie-db-prod.yourdomain.com:5434/reflectie_prod?sslmode=require
```

**Benefits:**
- ✅ Can change backend database without updating all connection strings
- ✅ Centralized SSL certificate management
- ✅ Can add rate limiting and access controls
- ✅ Easier to monitor and log database connections

### 5. Set Up Database Hostname and Port Configuration

**Current Setup:**
- Production database: Port 5432 (may conflict with immich)
- Acceptance database: Port 5433
- Immich PostgreSQL: Port 5432 (conflict!)

**Recommended Configuration:**

**Option A: Use Different Port for Production (Recommended)**
- Change production database to port 5434 (or another available port)
- Keep immich on 5432
- Keep acceptance on 5433

**Update `docker-compose.yml` for production:**
```yaml
postgres-prod:
  ports:
    - "${POSTGRES_PORT_PROD:-5434}:5432"  # Changed from 5432 to 5434
```

**Option B: Use Hostname/Subdomain for Databases**

Set up DNS records:
- `reflectie-db-prod.yourdomain.com` → Production database (port 5434)
- `reflectie-db-acc.yourdomain.com` → Acceptance database (port 5433) (optional)

**Benefits of using hostnames:**
- ✅ Easier to remember and manage
- ✅ Can change IP addresses without updating connection strings
- ✅ Better for SSL certificates
- ✅ More professional setup

**DNS Configuration:**

Add A records in your domain DNS settings:
```
reflectie-db-prod.yourdomain.com    A    YOUR_SERVER_IP
reflectie-db-acc.yourdomain.com      A    YOUR_SERVER_IP  (optional)
```

**Update Docker Compose Environment:**
```env
# In your .env file on the server
POSTGRES_PORT_PROD=5434  # Changed to avoid conflict with immich
```

### 6. Configure Environment Variables in Vercel

**Required Environment Variables:**

Go to: **Project Settings → Environment Variables**

Add these variables for **Production** environment:

**Using Hostname (Recommended):**
```
DATABASE_URL=postgresql://reflectie_user:YOUR_PASSWORD@reflectie-db-prod.yourdomain.com:5434/reflectie_prod?sslmode=require
DATABASE_ENV=prod
NODE_ENV=production
```

**Using IP Address:**
```
DATABASE_URL=postgresql://reflectie_user:YOUR_PASSWORD@YOUR_SERVER_IP:5434/reflectie_prod?sslmode=require
DATABASE_ENV=prod
NODE_ENV=production
```

**Or if using separate URLs:**

```
DATABASE_URL_PROD=postgresql://reflectie_user:YOUR_PASSWORD@reflectie-db-prod.yourdomain.com:5434/reflectie_prod?sslmode=require
DATABASE_ENV=prod
NODE_ENV=production
```

**Security Notes:**
- ✅ Use `?sslmode=require` for secure connections
- ✅ Never commit passwords to git
- ✅ Use strong, unique passwords
- ✅ Consider using connection pooling: `?connection_limit=10&pool_timeout=20`
- ✅ Use hostname instead of IP for easier management

### 7. Set Up Custom Domain in Vercel

**Steps to Add Custom Domain:**

1. **In Vercel Dashboard:**
   - Go to your project
   - Click **Settings** → **Domains**
   - Click **Add Domain**
   - Enter your domain (e.g., `reflectie.yourdomain.com` or `yourdomain.com`)

2. **Configure DNS Records:**

   **For Root Domain (yourdomain.com):**
   ```
   Type: A
   Name: @
   Value: 76.76.21.21  (Vercel's IP - check Vercel dashboard for current IP)
   TTL: Auto
   ```

   **For Subdomain (reflectie.yourdomain.com):**
   ```
   Type: CNAME
   Name: reflectie
   Value: cname.vercel-dns.com  (Vercel will provide exact value)
   TTL: Auto
   ```

   **Note:** Vercel will show you the exact DNS records needed in the dashboard.

3. **Wait for DNS Propagation:**
   - DNS changes can take 24-48 hours (usually much faster)
   - Vercel will show status: "Valid Configuration" when ready
   - You can check status in Vercel dashboard

4. **SSL Certificate:**
   - Vercel automatically provisions SSL certificates via Let's Encrypt
   - HTTPS will be enabled automatically once DNS is configured

**Domain Options:**
- `reflectie.yourdomain.com` - Subdomain (recommended)
- `yourdomain.com` - Root domain
- `www.yourdomain.com` - WWW subdomain

### 8. Database Migration Strategy

**Option A: Run Migrations on Deploy (Recommended)**

Create `vercel.json` with build command:

```json
{
  "buildCommand": "prisma generate && prisma migrate deploy && vite build"
}
```

**Or use Vercel Build Command in dashboard:**
```
prisma generate && prisma migrate deploy && vite build
```

**Option B: Use Vercel Post-Deploy Hook**

Create `api/migrate.ts` (not recommended for production, better to use build command)

**Option C: Manual Migration (For initial setup)**

Run migrations manually before first deploy:
```bash
DATABASE_URL="your_prod_url" npx prisma migrate deploy
```

### 9. Update Prisma Configuration for Production

**Ensure `prisma/schema.prisma` uses environment variable:**

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

**Your `prisma.config.ts` already handles this correctly.**

### 10. Database Connection from Vercel

**Important Considerations:**

1. **Firewall/Network Access:**
   - Vercel uses dynamic IPs (can't whitelist)
   - Options:
     - Allow all IPs (less secure)
     - Use VPN/tunnel
     - Use connection pooling service (PgBouncer)
     - Use managed database with Vercel integration

2. **Connection String Format:**
   ```
   postgresql://username:password@host:port/database?sslmode=require
   ```

3. **Connection Pooling:**
   - Add to connection string: `?connection_limit=10&pool_timeout=20`
   - Or use a connection pooler like PgBouncer

### 11. Update Database Connection Logic

**Your `src/lib/server/db/index.ts` already handles this correctly:**
- Uses `DATABASE_URL` if set (Vercel will set this)
- Falls back to `DATABASE_URL_PROD` if `DATABASE_ENV=prod`
- Throws error if neither is set

**For Vercel, set `DATABASE_URL` directly (simplest approach).**

### 12. Git Integration Setup

**Automatic Deployments:**
1. Connect repository to Vercel
2. Vercel automatically deploys on:
   - Push to `main`/`master` branch → Production
   - Push to other branches → Preview deployments
   - Pull requests → Preview deployments

**Branch Protection (Optional):**
- Set up branch protection in GitHub
- Require PR reviews before merging to main

### 13. Build Configuration

**Vercel will auto-detect:**
- Framework: SvelteKit
- Build Command: `npm run build` (or custom)
- Output Directory: `.svelte-kit` (auto-detected)
- Install Command: `npm install`

**Custom Build Command (if needed):**
```
prisma generate && prisma migrate deploy && vite build
```

### 14. Post-Deploy Verification

**Checklist after first deploy:**
- [ ] Site is accessible
- [ ] Database connection works
- [ ] Migrations ran successfully
- [ ] Can sign up new users
- [ ] Can sign in
- [ ] Can create person records
- [ ] Data persists correctly

**Check Vercel Logs:**
- Go to **Deployments → [Your Deployment] → Logs**
- Look for:
  - Prisma Client generation
  - Migration execution
  - Build errors
  - Runtime errors

### 15. Environment-Specific Configuration

**Production Environment Variables:**
```
DATABASE_URL=postgresql://user:pass@host:5432/db?sslmode=require
DATABASE_ENV=prod
NODE_ENV=production
```

**Preview/Development (Optional):**
```
DATABASE_URL_ACC=postgresql://user:pass@host:5433/db?sslmode=require
DATABASE_ENV=acc
NODE_ENV=development
```

### 16. Security Checklist

- [ ] Database password is strong and unique
- [ ] SSL connection enabled (`?sslmode=require`)
- [ ] Environment variables set in Vercel (not in code)
- [ ] `.env` file in `.gitignore` (already done)
- [ ] Database firewall configured (if applicable)
- [ ] HTTPS enabled (automatic on Vercel)
- [ ] Session cookies secure in production (already configured)

### 17. Monitoring & Debugging

**Vercel Dashboard:**
- **Deployments**: View deployment history
- **Logs**: Real-time and historical logs
- **Analytics**: Performance metrics
- **Functions**: Serverless function logs

**Database Monitoring:**
- Check connection count
- Monitor query performance
- Set up alerts for connection failures

### 18. Rollback Strategy

**If deployment fails:**
1. Check Vercel logs for errors
2. Verify environment variables are set
3. Check database connectivity
4. Rollback to previous deployment in Vercel dashboard
5. Fix issues and redeploy

## Implementation Steps

### Immediate Actions:

1. **Update Database Port Configuration:**
   - Update `docker-compose.yml` to use port 5434 for production (avoid immich conflict)
   - Update `.env` file on server: `POSTGRES_PORT_PROD=5434`
   - Restart production database container

2. **Set Up Nginx Proxy Manager:**
   - Configure Stream proxy for production database (TCP proxy)
   - Configure Stream proxy for acceptance database (optional)
   - Set up SSL certificates for database hostnames
   - Configure firewall rules for proxy ports

3. **Set Up Database Hostname (Optional but Recommended):**
   - Add DNS A record: `reflectie-db-prod.yourdomain.com` → Your Nginx Proxy Manager IP
   - (Optional) Add DNS A record: `reflectie-db-acc.yourdomain.com` → Your Nginx Proxy Manager IP
   - Wait for DNS propagation

3. **Update `package.json` build script:**
   ```json
   "build": "prisma generate && vite build",
   "postinstall": "prisma generate"
   ```

4. **Create Vercel project:**
   - Connect GitHub repository
   - Vercel will auto-detect SvelteKit

5. **Set Up Custom Domain in Vercel:**
   - Add domain in Vercel dashboard
   - Configure DNS records as shown by Vercel
   - Wait for DNS propagation and SSL certificate

6. **Set environment variables in Vercel:**
   - `DATABASE_URL` (using hostname: `reflectie-db-prod.yourdomain.com:5434` or IP:port)
   - `DATABASE_ENV=prod`
   - `NODE_ENV=production`

7. **Configure build command (optional):**
   - In Vercel dashboard: Settings → General → Build Command
   - Set to: `prisma generate && prisma migrate deploy && vite build`
   - Or update `vercel.json`

8. **Ensure database is accessible:**
   - Test connection from your local machine using new hostname/port
   - Configure firewall if needed (allow port 5434)
   - Use SSL connection

9. **Deploy:**
   - Push to main branch
   - Vercel will automatically deploy
   - Check logs for errors

## Files to Create/Update

### Files to Create:
- [ ] `vercel.json` (optional, for custom configuration)

### Files to Update:
- [ ] `package.json` (add postinstall script, update build script)

### Files Already Correct:
- ✅ `svelte.config.js` (Vercel adapter configured)
- ✅ `prisma/schema.prisma` (uses DATABASE_URL)
- ✅ `src/lib/server/db/index.ts` (handles environment variables)
- ✅ `.gitignore` (excludes .env files)

## Common Issues & Solutions

### Issue: "Prisma Client not generated"
**Solution:** Add `postinstall` script to `package.json`

### Issue: "Migrations not running"
**Solution:** Add `prisma migrate deploy` to build command

### Issue: "Database connection timeout"
**Solution:** 
- Check firewall rules
- Verify connection string
- Use connection pooling
- Check database is running

### Issue: "Environment variables not found"
**Solution:**
- Verify variables are set in Vercel dashboard
- Check variable names match exactly
- Ensure variables are set for correct environment (Production)

### Issue: "Build fails"
**Solution:**
- Check Vercel logs
- Verify all dependencies are in `package.json`
- Ensure Node.js version is compatible

## Production Database Connection String Template

**Using Hostname (Recommended):**
```
postgresql://USERNAME:PASSWORD@reflectie-db-prod.yourdomain.com:PORT/DATABASE?sslmode=require&connection_limit=10&pool_timeout=20
```

**Using IP Address:**
```
postgresql://USERNAME:PASSWORD@HOST_IP:PORT/DATABASE?sslmode=require&connection_limit=10&pool_timeout=20
```

**Examples:**

**With Hostname:**
```
postgresql://reflectie_user:SecurePass123!@reflectie-db-prod.yourdomain.com:5434/reflectie_prod?sslmode=require
```

**With IP Address:**
```
postgresql://reflectie_user:SecurePass123!@192.168.86.111:5434/reflectie_prod?sslmode=require
```

**Note:** Port changed from 5432 to 5434 to avoid conflict with immich PostgreSQL.

## Next Steps After Deployment

1. **Test the application:**
   - Sign up a new user
   - Sign in
   - Create person records
   - Verify data persists

2. **Set up custom domain (optional):**
   - Add domain in Vercel dashboard
   - Configure DNS records

3. **Enable analytics (optional):**
   - Vercel Analytics
   - Custom analytics solution

4. **Set up monitoring:**
   - Error tracking (Sentry, etc.)
   - Uptime monitoring
   - Database monitoring

## Quick Reference

**Vercel Dashboard:** https://vercel.com/dashboard

**Environment Variables:** Project Settings → Environment Variables

**Deployments:** Deployments tab → View logs

**Build Logs:** Each deployment → Logs section

**Documentation:** https://vercel.com/docs

