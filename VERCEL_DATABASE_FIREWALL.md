# Vercel Database Connection - Firewall Configuration

## Problem
Vercel's build environment can't reach your database because:
- Vercel uses dynamic IP addresses (can't whitelist specific IPs)
- Your firewall/router might be blocking connections from Vercel

## Solutions

### Option 1: Allow All IPs (Simplest, Less Secure)

**On your server/router firewall, allow connections from anywhere on port 5432:**

```bash
# If using UFW
sudo ufw allow 5432/tcp

# If using firewalld
sudo firewall-cmd --add-port=5432/tcp --permanent
sudo firewall-cmd --reload
```

**In your router:**
- Ensure port 5432 is forwarded to Nginx Proxy Manager
- Don't restrict by source IP

**Security Note:** This allows connections from anywhere. Make sure:
- ✅ Strong database passwords
- ✅ SSL enabled (`sslmode=require`)
- ✅ Database user has minimal permissions
- ✅ Consider IP whitelisting in PostgreSQL itself (if possible)

### Option 2: Run Migrations Separately (More Secure)

**Step 1: Run migrations manually before first deploy**

From your local machine or server:
```bash
DATABASE_URL="postgresql://reflectie_user:PASSWORD@reflectie-db-prod.ontwerpkracht.nl:5432/reflectie_prod?sslmode=require" npx prisma migrate deploy
```

**Step 2: Update vercel.json to skip migrations during build**

Already done - build command now only generates Prisma Client and builds the app.

**Step 3: For future migrations**

Run migrations manually when needed, or use a separate migration service.

### Option 3: Use Vercel's IP Ranges (If Available)

**Check if Vercel publishes IP ranges:**
- Vercel doesn't publish static IP ranges for builds
- Builds run on dynamic infrastructure
- This option is not practical

### Option 4: VPN/SSH Tunnel (Most Secure, Complex)

Set up a VPN or SSH tunnel, but this is complex and may not work for builds.

## Recommended Approach

**For now, use Option 1 (Allow All IPs) with these security measures:**

1. ✅ Strong database password
2. ✅ SSL required (`sslmode=require` in connection string)
3. ✅ Database user has only necessary permissions
4. ✅ Monitor connection logs
5. ✅ Consider adding IP restrictions in PostgreSQL `pg_hba.conf` if needed

## Testing Database Access from Vercel

After allowing connections, test by:

1. **Check Vercel build logs** - migrations should run successfully
2. **Check database logs** - should see connections from Vercel
3. **Test the deployed app** - should be able to connect to database

## Firewall Configuration Checklist

- [ ] Router forwards port 5432 to Nginx Proxy Manager
- [ ] Server firewall allows port 5432 from anywhere (or Vercel IPs if possible)
- [ ] Nginx Proxy Manager is running and accessible
- [ ] Database container is running
- [ ] Connection string uses correct hostname and port
- [ ] SSL is enabled in connection string

## Connection String for Vercel

Make sure this is set in Vercel environment variables:

```
DATABASE_URL=postgresql://reflectie_user:YOUR_PASSWORD@reflectie-db-prod.ontwerpkracht.nl:5432/reflectie_prod?sslmode=require
```

## Next Steps

1. **Allow port 5432 in firewall** (Option 1)
2. **Redeploy on Vercel** - should now be able to connect
3. **Monitor logs** - check both Vercel and database logs
4. **Test the app** - verify it works correctly

