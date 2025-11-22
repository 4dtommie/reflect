# Nginx Proxy Manager Setup for PostgreSQL

## Overview
Configure Nginx Proxy Manager to act as a reverse proxy for your PostgreSQL databases, providing SSL termination and centralized management.

## Prerequisites

- [ ] Nginx Proxy Manager installed and running
- [ ] Access to Nginx Proxy Manager web interface (usually port 81)
- [ ] PostgreSQL containers running
- [ ] DNS records ready to point to Nginx Proxy Manager

## Step-by-Step Configuration

### SSL Certificate Configuration for TCP Forwarding

When setting up SSL for TCP/Stream proxies, Nginx Proxy Manager will ask you to configure SSL certificates. Here's how to handle it:

**Understanding the SSL Options:**

1. **DNS Challenge (Recommended for TCP):**
   - Required for TCP/Stream proxies
   - Uses DNS API to verify domain ownership
   - Requires API access to your DNS provider

2. **Configuration Steps:**
   - **Domain Name:** Your database hostname (e.g., `reflectie-db-prod.ontwerpkracht.nl`)
   - **Use a DNS Challenge:** Toggle ON
   - **DNS Provider:** Select from dropdown (Cloudflare, Route53, etc.)
   - **Propagation Seconds:** Leave empty or set 60-120

3. **If Your DNS Provider Isn't Listed:**
   - **Option 1:** Skip SSL for now (you can add it later)
   - **Option 2:** Use application-level SSL (`sslmode=require` in connection string)
   - **Option 3:** Configure DNS provider API manually (advanced)

**Common DNS Providers:**
- **Cloudflare:** Most common, well-supported
- **AWS Route53:** If using AWS
- **DigitalOcean:** If using DigitalOcean DNS
- **Google Cloud DNS:** If using GCP
- **Namecheap, GoDaddy, etc.:** May require manual configuration

**For Now (Quick Setup):**
If you want to proceed without SSL configuration:
1. Click "Cancel" or skip the SSL step
2. Complete the stream proxy setup
3. You can add SSL later
4. Use `sslmode=require` in your PostgreSQL connection string for encryption

## Step-by-Step Configuration

### 1. Access Nginx Proxy Manager

1. Open your browser and navigate to:
   - `http://your-server-ip:81` (default)
   - Or your configured domain for Nginx Proxy Manager

2. Log in with your admin credentials

### 2. Navigate to Streams

1. In the Nginx Proxy Manager interface, look for **Streams** tab
2. If you don't see it, check if you need to enable TCP/UDP proxying in settings
3. Click **Add Stream Proxy** or **Add Proxy Host** → **Streams**

### 3. Configure Production Database Stream

**Note:** The following steps guide you through the Nginx Proxy Manager interface. If you see an SSL certificate configuration screen, refer to the SSL section below.

**Stream Configuration:**

1. **Inbound Settings:**
   - **Domain Name:** `reflectie-db-prod.yourdomain.com`
   - **Port:** `5434` (external port)
   - **Scheme:** `tcp` (important - PostgreSQL uses TCP, not HTTP)
   - **Access List:** (optional) Restrict access by IP if needed

2. **Outbound Settings:**
   - **Forward Hostname:** 
     - If PostgreSQL is on same server: `localhost` or `127.0.0.1`
     - If using Docker: `postgres-prod` (container name) or `localhost`
     - If on different server: IP address of database server
   - **Forward Port:** `5432` (internal PostgreSQL port)
   - **Scheme:** `tcp`

3. **SSL/TLS Configuration:**

   **Option A: Use Let's Encrypt with DNS Challenge (Recommended for TCP)**
   
   For TCP/Stream proxies, Nginx Proxy Manager uses DNS challenge for SSL certificates:
   
   - **Domain Name:** Already filled: `reflectie-db-prod.ontwerpkracht.nl` (or your domain)
   - **Use a DNS Challenge:** Toggle ON (required for TCP forwarding)
   - **DNS Provider:** Select your DNS provider from the dropdown:
     - Common options: Cloudflare, AWS Route53, DigitalOcean, Google Cloud DNS, etc.
     - If your provider isn't listed, you may need to use HTTP challenge or manual certificate
   - **Propagation Seconds:** Leave empty (uses default) or set to 60-120 seconds
   
   **Important Notes:**
   - DNS challenge requires API access to your DNS provider
   - You'll need to configure API credentials in Nginx Proxy Manager
   - The DNS provider must support API-based DNS record creation
   
   **If your DNS provider isn't listed:**
   - You can skip SSL for now (PostgreSQL can use SSL at the application level)
   - Or use a manual certificate
   - Or use HTTP challenge (if supported for your setup)
   
   **Option B: Skip SSL (Simpler, but less secure)**
   
   - You can skip SSL certificate configuration
   - PostgreSQL connection will still work
   - Use `sslmode=require` in connection string for application-level SSL
   - Less secure but simpler setup
   
   **Option C: Upload Manual Certificate**
   
   - If you have your own SSL certificate
   - Upload it manually in the SSL section
   - More complex but gives you full control

4. **Save Configuration**

### 4. Configure Acceptance Database Stream (Optional)

**Stream Configuration:**

1. **Inbound Settings:**
   - **Domain Name:** `reflectie-db-acc.yourdomain.com`
   - **Port:** `5433` (external port)
   - **Scheme:** `tcp`

2. **Outbound Settings:**
   - **Forward Hostname:** `localhost` or `postgres-acc` (container name)
   - **Forward Port:** `5432` (internal PostgreSQL port)
   - **Scheme:** `tcp`

3. **SSL/TLS:** (Optional)
   - If configuring SSL, use DNS challenge method
   - Select your DNS provider
   - Or skip for now and add later

4. **Save Configuration**

### 5. Configure DNS Records

**Point DNS to Nginx Proxy Manager server:**

```
Type: A
Name: reflectie-db-prod
Value: YOUR_NGINX_PROXY_MANAGER_IP
TTL: 3600

Type: A
Name: reflectie-db-acc
Value: YOUR_NGINX_PROXY_MANAGER_IP
TTL: 3600
```

**Result:**
- `reflectie-db-prod.yourdomain.com` → Nginx Proxy Manager → PostgreSQL Production
- `reflectie-db-acc.yourdomain.com` → Nginx Proxy Manager → PostgreSQL Acceptance

### 6. Configure Firewall

**Open proxy ports on your firewall:**

```bash
# Ubuntu/Debian (UFW)
sudo ufw allow 5434/tcp comment 'PostgreSQL Production Proxy'
sudo ufw allow 5433/tcp comment 'PostgreSQL Acceptance Proxy'

# Or for specific IPs only (more secure)
sudo ufw allow from VERCEL_IP_RANGE to any port 5434 proto tcp
```

**Note:** Vercel uses dynamic IPs, so you may need to allow all IPs or use a VPN/tunnel.

### 7. Docker Network Configuration (If Applicable)

**If PostgreSQL is in Docker and Nginx Proxy Manager is also in Docker:**

1. **Ensure both are on the same network:**
   ```bash
   # Check if containers are on same network
   docker network ls
   
   # Connect Nginx Proxy Manager to PostgreSQL network
   docker network connect postgres-network nginx-proxy-manager
   ```

2. **Or use Docker service names:**
   - Forward Hostname: `postgres-prod` (container name)
   - Forward Hostname: `postgres-acc` (container name)

### 8. Test Connection

**Test the proxy connection:**

```bash
# Test production database through proxy
psql postgresql://reflectie_user:PASSWORD@reflectie-db-prod.yourdomain.com:5434/reflectie_prod

# Test acceptance database through proxy
psql postgresql://reflectie_user:PASSWORD@reflectie-db-acc.yourdomain.com:5433/reflectie_acc
```

**If connection fails, check:**
- Nginx Proxy Manager logs
- Firewall rules
- DNS resolution
- Container network connectivity

## Connection String Format

**After proxy setup, connection strings remain the same:**

```
postgresql://reflectie_user:PASSWORD@reflectie-db-prod.yourdomain.com:5434/reflectie_prod?sslmode=require
```

The proxy is transparent - your application connects to the hostname, and Nginx Proxy Manager forwards to the actual database.

## Benefits of Using Nginx Proxy Manager

✅ **Centralized Management:**
- Manage all database access from one interface
- Easy to update backend without changing connection strings

✅ **SSL/TLS Termination:**
- Handle SSL certificates in one place
- Automatic certificate renewal with Let's Encrypt

✅ **Security:**
- Can add IP whitelisting
- Rate limiting (if supported)
- Connection logging

✅ **Flexibility:**
- Easy to change backend database
- Can add multiple backends (load balancing)
- Can migrate databases without updating all clients

✅ **Monitoring:**
- View connection logs
- Monitor traffic
- Track usage

## Troubleshooting

### Connection Refused

**Check:**
1. Nginx Proxy Manager is running
2. Stream proxy is enabled and active
3. Firewall allows connections on proxy port
4. DNS resolves correctly
5. Backend database is accessible from Nginx Proxy Manager

### SSL Errors

**Check:**
1. SSL certificate is valid
2. Certificate matches the hostname
3. Certificate hasn't expired
4. Client supports the SSL/TLS version

### Docker Network Issues

**If using Docker:**
1. Ensure containers are on same network
2. Use container names instead of localhost
3. Check network connectivity: `docker network inspect network-name`

### Port Conflicts

**If port is already in use:**
1. Check what's using the port: `sudo netstat -tulpn | grep 5434`
2. Change proxy port to different value
3. Update connection strings accordingly

## Advanced Configuration

### IP Whitelisting

**Restrict access to specific IPs:**
1. In Nginx Proxy Manager, go to **Access Lists**
2. Create new access list with allowed IPs
3. Assign to your stream proxy

**Note:** Vercel uses dynamic IPs, so IP whitelisting may not work for Vercel deployments.

### SSL Passthrough

**If you want end-to-end encryption:**
- Configure PostgreSQL to handle SSL directly
- Use SSL passthrough in Nginx Proxy Manager
- Client connects with SSL to database

### Load Balancing

**Multiple database backends:**
- Add multiple forward hosts
- Configure load balancing method
- Useful for read replicas

## Quick Reference

**Production Database Proxy:**
- Inbound: `reflectie-db-prod.yourdomain.com:5434`
- Outbound: `localhost:5432` (or `postgres-prod:5432`)

**Acceptance Database Proxy:**
- Inbound: `reflectie-db-acc.yourdomain.com:5433`
- Outbound: `localhost:5432` (or `postgres-acc:5432`)

**Connection String:**
```
postgresql://reflectie_user:PASSWORD@reflectie-db-prod.yourdomain.com:5434/reflectie_prod?sslmode=require
```

