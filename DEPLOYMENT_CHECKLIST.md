# Vercel Deployment Checklist

## ✅ What's Been Done

- [x] Vercel adapter installed and configured
- [x] `package.json` updated with `postinstall` script for Prisma Client generation
- [x] `package.json` build script updated to include Prisma Client generation
- [x] `vercel.json` created with build command that runs migrations
- [x] Deployment plan document created (`VERCEL_DEPLOYMENT_PLAN.md`)

## 📋 What You Need to Do

### 1. Set Up Vercel Account & Project

- [ ] Create account at [vercel.com](https://vercel.com) (or sign in)
- [ ] Connect your Git repository (GitHub/GitLab/Bitbucket)
- [ ] Import your project (Vercel will auto-detect SvelteKit)

### 2. Set Up Nginx Proxy Manager for PostgreSQL

- [ ] Access Nginx Proxy Manager web interface
- [ ] Create Stream proxy for production database:
  - Inbound: `reflectie-db-prod.yourdomain.com:5434`
  - Outbound: `localhost:5432` (or container name)
- [ ] (Optional) Create Stream proxy for acceptance database:
  - Inbound: `reflectie-db-acc.yourdomain.com:5433`
  - Outbound: `localhost:5432` (or container name)
- [ ] Configure SSL certificates for database hostnames
- [ ] Configure firewall to allow proxy ports (5434, 5433)
- [ ] Test proxy connections

**See `NGINX_PROXY_MANAGER_SETUP.md` for detailed instructions.**

### 3. Set Up Database Hostname and Port

- [ ] Update `docker-compose.yml` to use port 5434 for production (avoid immich conflict)
- [ ] Add DNS A record: `reflectie-db-prod.yourdomain.com` → Your Nginx Proxy Manager IP
- [ ] (Optional) Add DNS A record: `reflectie-db-acc.yourdomain.com` → Your Nginx Proxy Manager IP
- [ ] Restart production database container with new port
- [ ] Test database connection through proxy

**See `DATABASE_HOSTNAME_SETUP.md` for detailed instructions.**

### 4. Configure Environment Variables

Go to: **Project Settings → Environment Variables**

Add these for **Production** environment:

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

**Important:**
- Replace `YOUR_PASSWORD` with your actual production database password
- Replace `reflectie-db-prod.yourdomain.com` with your hostname (or use IP address)
- **Port is 5434** (changed from 5432 to avoid immich conflict)
- Keep `?sslmode=require` for secure connections

### 5. Set Up Custom Domain in Vercel

- [ ] Go to Vercel project → Settings → Domains
- [ ] Add your domain (e.g., `reflectie.yourdomain.com`)
- [ ] Configure DNS records as shown by Vercel
- [ ] Wait for DNS propagation (usually 5-30 minutes)
- [ ] Verify SSL certificate is issued automatically

### 6. Ensure Database is Accessible

- [ ] Production database is running
- [ ] Database is accessible from the internet (or configure firewall)
- [ ] Test connection string locally:
  ```bash
  DATABASE_URL="your_prod_connection_string" npx prisma migrate deploy
  ```

### 7. Deploy

- [ ] Push your code to the main branch
- [ ] Vercel will automatically deploy
- [ ] Check deployment logs for errors

### 8. Verify Deployment

- [ ] Site is accessible
- [ ] Can sign up a new user
- [ ] Can sign in
- [ ] Can create person records
- [ ] Data persists correctly

## 🔧 Build Configuration

The build process will:
1. Run `npm install` (triggers `postinstall` → generates Prisma Client)
2. Run `prisma generate` (safety net)
3. Run `prisma migrate deploy` (applies migrations to production)
4. Run `vite build` (builds the SvelteKit app)

## 🚨 Common Issues

**"Prisma Client not found"**
- ✅ Fixed by `postinstall` script

**"Migrations not running"**
- ✅ Fixed by `vercel.json` build command

**"Database connection failed"**
- Check firewall rules
- Verify connection string
- Ensure database is running

**"Environment variables not found"**
- Verify variables are set in Vercel dashboard
- Check variable names match exactly
- Ensure set for Production environment

## 📝 Quick Reference

**Vercel Dashboard:** https://vercel.com/dashboard

**Environment Variables:** Project Settings → Environment Variables

**Deployments:** Deployments tab → View logs

**Full Documentation:** See `VERCEL_DEPLOYMENT_PLAN.md`

