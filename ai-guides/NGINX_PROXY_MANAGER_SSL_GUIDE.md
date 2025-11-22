# Nginx Proxy Manager SSL Configuration for TCP/Stream Proxies

## Overview
This guide helps you configure SSL certificates for PostgreSQL database proxies in Nginx Proxy Manager.

## Understanding the SSL Certificate Screen

When setting up a Stream proxy for PostgreSQL, Nginx Proxy Manager will prompt you to configure SSL. Here's what each field means:

### Fields Explained

1. **Domain Names:**
   - Pre-filled with your database hostname (e.g., `reflectie-db-prod.ontwerpkracht.nl`)
   - This is the domain that will receive the SSL certificate

2. **Use a DNS Challenge:**
   - **Toggle ON** (required for TCP/Stream proxies)
   - HTTP challenge doesn't work for TCP connections
   - DNS challenge verifies domain ownership via DNS records

3. **DNS Provider:**
   - **Required field** - Select your DNS provider from dropdown
   - Common options:
     - Cloudflare (most common)
     - AWS Route53
     - DigitalOcean
     - Google Cloud DNS
     - Namecheap
     - GoDaddy
     - And more...

4. **Propagation Seconds:**
   - Leave empty to use default (usually 60-120 seconds)
   - Or set manually: `60` to `300` seconds
   - Time to wait for DNS changes to propagate

## Configuration Options

### Option 1: Configure DNS Challenge (Recommended if Provider Supported)

**If your DNS provider is in the list:**

1. **Select DNS Provider:**
   - Choose your provider from dropdown (e.g., Cloudflare)

2. **Configure API Credentials:**
   - You'll need to provide API credentials for your DNS provider
   - These are usually found in your DNS provider's dashboard
   - Nginx Proxy Manager will guide you through this

3. **For Cloudflare (Most Common):**
   - Go to Cloudflare Dashboard → My Profile → API Tokens
   - Create token with Zone DNS Edit permissions
   - Enter token in Nginx Proxy Manager

4. **For Other Providers:**
   - Check your DNS provider's documentation
   - Look for API keys or tokens
   - Enter credentials as prompted

5. **Complete Setup:**
   - Click "Save" or "Request Certificate"
   - Wait for DNS propagation
   - Certificate will be issued automatically

### Option 2: Skip SSL for Now (Simplest)

**If you want to proceed without SSL:**

1. **Click "Cancel" or "Skip"** on the SSL configuration screen
2. **Complete the stream proxy setup** without SSL
3. **Use application-level SSL** in your PostgreSQL connection string:
   ```
   postgresql://user:pass@reflectie-db-prod.ontwerpkracht.nl:5434/db?sslmode=require
   ```
4. **Add SSL later** if needed

**Benefits:**
- ✅ Faster setup
- ✅ No DNS API configuration needed
- ✅ Still secure (SSL at application level)
- ✅ Can add proxy-level SSL later

**Note:** This is perfectly fine for most use cases. PostgreSQL will still use SSL encryption between the application and database.

### Option 3: Manual Certificate (Advanced)

**If you have your own SSL certificate:**

1. **Skip the automatic certificate request**
2. **Go to SSL Certificates section** in Nginx Proxy Manager
3. **Upload your certificate manually:**
   - Certificate file (.crt or .pem)
   - Private key file (.key)
   - Certificate chain (if applicable)

## Common DNS Providers Setup

### Cloudflare

**Steps:**
1. Log in to Cloudflare Dashboard
2. Go to: My Profile → API Tokens
3. Click "Create Token"
4. Use "Edit zone DNS" template
5. Select your zone (domain)
6. Copy the generated token
7. In Nginx Proxy Manager, select "Cloudflare" as DNS provider
8. Enter your Cloudflare email and the API token

### AWS Route53

**Steps:**
1. Go to AWS IAM Console
2. Create user with Route53 permissions
3. Create access key
4. In Nginx Proxy Manager, select "Route53"
5. Enter AWS Access Key ID and Secret Access Key

### DigitalOcean

**Steps:**
1. Go to DigitalOcean API section
2. Generate Personal Access Token
3. In Nginx Proxy Manager, select "DigitalOcean"
4. Enter the API token

## Troubleshooting

### "Please select an item in the list" Error

**Problem:** DNS Provider dropdown is empty or not selected

**Solutions:**
1. **Check if your provider is supported:**
   - Look through the dropdown list
   - If not listed, use Option 2 (Skip SSL)

2. **Refresh the page:**
   - Sometimes the list needs to load
   - Try refreshing the browser

3. **Use Skip Option:**
   - Click Cancel/Skip
   - Complete proxy setup
   - Add SSL later if needed

### DNS Challenge Fails

**Common Issues:**
- API credentials incorrect
- DNS API not enabled
- Insufficient permissions
- DNS propagation too slow

**Solutions:**
- Double-check API credentials
- Verify API permissions
- Increase propagation seconds
- Or skip SSL and use application-level encryption

### Certificate Not Issuing

**Check:**
1. DNS records are correct
2. Domain points to correct IP
3. DNS propagation completed
4. API credentials are valid

## Recommendation

**For Quick Setup:**
- **Skip SSL configuration** for now
- Complete the stream proxy setup
- Use `sslmode=require` in connection string
- Add proxy-level SSL later if needed

**For Production:**
- Configure DNS challenge if your provider is supported
- Provides additional security layer
- Better for compliance requirements

## Connection String Examples

**With Proxy-Level SSL:**
```
postgresql://user:pass@reflectie-db-prod.ontwerpkracht.nl:5434/db?sslmode=require
```

**Without Proxy-Level SSL (Application-Level Only):**
```
postgresql://user:pass@reflectie-db-prod.ontwerpkracht.nl:5434/db?sslmode=require
```

**Note:** Both use SSL encryption. The difference is where SSL terminates (at proxy vs at database).

## Next Steps

After configuring (or skipping) SSL:

1. **Complete Stream Proxy Setup:**
   - Finish configuring inbound/outbound settings
   - Save the configuration

2. **Test Connection:**
   - Test database connection through proxy
   - Verify it works correctly

3. **Update Connection Strings:**
   - Use the proxy hostname in your connection strings
   - Test from your application

4. **Add SSL Later (if skipped):**
   - Can always add SSL certificate later
   - Go to SSL Certificates section
   - Request new certificate
   - Assign to stream proxy

