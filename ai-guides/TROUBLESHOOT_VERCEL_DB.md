# Troubleshooting Vercel Database Connection

## Current Error
```
Error: P1001: Can't reach database server at `reflectie-db-prod.ontwerpkracht.nl:5432`
```

## Step-by-Step Troubleshooting

### 1. Verify DNS Resolution from Internet

Test if the domain resolves correctly from outside your network:

```bash
# From any machine (or use online tool like https://dnschecker.org)
nslookup reflectie-db-prod.ontwerpkracht.nl
```

Should return: `178.84.92.102` (or your Nginx Proxy Manager IP)

### 2. Check Router Port Forwarding

**In your router admin panel:**

- [ ] Port 5432 is forwarded to Nginx Proxy Manager's internal IP
- [ ] Forwarding is enabled/active
- [ ] Protocol is TCP
- [ ] No source IP restrictions

**Example router config:**
```
External Port: 5432
Internal IP: [Nginx Proxy Manager IP, e.g., 192.168.1.100]
Internal Port: 5432
Protocol: TCP
```

### 3. Check Server Firewall

**On your server (where Nginx Proxy Manager runs):**

```bash
# Check if port 5432 is open
sudo ufw status | grep 5432

# If not open, allow it
sudo ufw allow 5432/tcp

# Check firewall status
sudo ufw status verbose
```

**Or if using firewalld:**
```bash
sudo firewall-cmd --list-ports
sudo firewall-cmd --add-port=5432/tcp --permanent
sudo firewall-cmd --reload
```

### 4. Test Connection from External IP

**Test if the database is reachable from the internet:**

Use an online tool or from a different network:
- https://www.yougetsignal.com/tools/open-ports/
- Enter your public IP: `178.84.92.102`
- Port: `5432`
- Should show as "Open"

**Or use telnet from external machine:**
```bash
telnet 178.84.92.102 5432
# Or
nc -zv 178.84.92.102 5432
```

### 5. Check Nginx Proxy Manager

**In Nginx Proxy Manager:**

- [ ] Stream proxy is enabled/active
- [ ] Inbound: `reflectie-db-prod.ontwerpkracht.nl:5432`
- [ ] Outbound: `postgres-prod:5432` (or correct container name)
- [ ] No errors in logs

### 6. Check PostgreSQL Container

**On your server:**

```bash
# Check if container is running
docker ps | grep postgres-prod

# Check container logs
docker logs postgres-prod

# Test connection from server to container
docker exec postgres-prod psql -U reflectie_user -d reflectie_prod -c "SELECT 1;"
```

### 7. Test Connection Chain

**Test each step:**

1. **From server to container:**
   ```bash
   docker exec postgres-prod psql -U reflectie_user -d reflectie_prod -c "SELECT 1;"
   ```

2. **From server through proxy:**
   ```bash
   psql postgresql://reflectie_user:PASSWORD@localhost:5432/reflectie_prod
   ```

3. **From external network (your local machine):**
   ```bash
   psql postgresql://reflectie_user:PASSWORD@reflectie-db-prod.ontwerpkracht.nl:5432/reflectie_prod
   ```

### 8. Check Vercel Environment Variables

**In Vercel Dashboard:**

- [ ] `DATABASE_URL` is set correctly
- [ ] Environment is set to "Production" (not Preview/Development)
- [ ] No typos in the connection string
- [ ] Password is correct

**Correct format:**
```
postgresql://reflectie_user:YOUR_PASSWORD@reflectie-db-prod.ontwerpkracht.nl:5432/reflectie_prod?sslmode=require
```

### 9. Common Issues

**Issue: ISP blocks incoming connections**
- Some ISPs block incoming connections on residential connections
- Solution: Use a VPS or cloud server, or contact ISP

**Issue: Router doesn't support port forwarding**
- Some routers have limitations
- Solution: Check router documentation, may need to enable "DMZ" or "Exposed Host"

**Issue: Double NAT**
- If behind multiple routers/NATs
- Solution: Forward port on all routers in chain

**Issue: Cloudflare or other proxy**
- If using Cloudflare proxy, it won't work for TCP connections
- Solution: Use DNS-only mode (gray cloud) in Cloudflare

### 10. Alternative: Test with Direct IP

**Temporarily test with IP instead of domain:**

In Vercel, try:
```
DATABASE_URL=postgresql://reflectie_user:PASSWORD@178.84.92.102:5432/reflectie_prod?sslmode=require
```

If this works, the issue is DNS-related.
If this doesn't work, the issue is firewall/network.

## Quick Checklist

- [ ] DNS resolves correctly from internet
- [ ] Router forwards port 5432 to Nginx Proxy Manager
- [ ] Server firewall allows port 5432
- [ ] Nginx Proxy Manager is running
- [ ] Stream proxy is configured correctly
- [ ] PostgreSQL container is running
- [ ] Can connect from external network (test from your local machine)
- [ ] Vercel environment variables are set correctly

## Next Steps

1. **Test port 5432 from external network** - Use online port checker
2. **Check firewall rules** - Ensure port 5432 is open
3. **Verify router forwarding** - Check router configuration
4. **Test connection manually** - From your local machine using the domain
5. **Check Nginx Proxy Manager logs** - Look for connection attempts

