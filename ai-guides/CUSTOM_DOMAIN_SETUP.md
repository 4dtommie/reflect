# Custom Domain Setup for Vercel

## Overview
Map your Vercel deployment to your custom domain `reflectie.ontwerpkracht.nl`.

## Step-by-Step Instructions

### 1. Add Domain in Vercel Dashboard

1. **Go to your Vercel project:**
   - Navigate to [vercel.com/dashboard](https://vercel.com/dashboard)
   - Select your Reflectie AI project

2. **Go to Settings:**
   - Click on **Settings** tab
   - Click on **Domains** in the left sidebar

3. **Add Domain:**
   - Click **Add Domain** button
   - Enter: `reflectie.ontwerpkracht.nl`
   - Click **Add**

### 2. Configure DNS Records

Vercel will show you the exact DNS records you need to add. For a subdomain like `reflectie.ontwerpkracht.nl`, you'll typically need:

**DNS Record Type: CNAME**

```
Type: CNAME
Name: reflectie
Value: cname.vercel-dns.com
TTL: Auto (or 3600)
```

**Note:** Vercel will show you the exact CNAME value in the dashboard - it might be something like:
- `cname.vercel-dns.com`
- Or a specific value like `cname-xyz.vercel-dns.com`

**Important:** Use the exact value shown in Vercel dashboard!

### 3. Add DNS Record in Your DNS Provider

**Where to add:**
- Log into your DNS provider (where `ontwerpkracht.nl` is managed)
- This might be:
  - Your domain registrar
  - Cloudflare
  - AWS Route53
  - Or another DNS service

**Steps:**
1. Find DNS management / DNS records section
2. Add new CNAME record:
   - **Name/Host:** `reflectie`
   - **Value/Target:** (the CNAME value from Vercel dashboard)
   - **TTL:** Auto or 3600
3. Save the record

### 4. Wait for DNS Propagation

- DNS changes can take 5 minutes to 48 hours
- Usually takes 5-30 minutes
- Vercel will show status in the dashboard

**Check status in Vercel:**
- Go to Settings → Domains
- You'll see status:
  - ⏳ "Pending" - DNS not propagated yet
  - ✅ "Valid Configuration" - Ready!
  - ❌ "Invalid Configuration" - Check DNS records

### 5. SSL Certificate

**Automatic:**
- Vercel automatically provisions SSL certificates via Let's Encrypt
- HTTPS will be enabled automatically once DNS is configured
- No action needed from you

### 6. Verify It Works

**After DNS propagates:**
1. Visit `https://reflectie.ontwerpkracht.nl`
2. Should see your Reflectie AI application
3. SSL certificate should be valid (green lock icon)

## DNS Configuration Details

### For Subdomain (reflectie.ontwerpkracht.nl)

**CNAME Record:**
```
Type: CNAME
Name: reflectie
Value: [Value from Vercel dashboard]
TTL: Auto
```

### For Root Domain (ontwerpkracht.nl)

**If you want to use the root domain instead:**

**A Record:**
```
Type: A
Name: @
Value: 76.76.21.21  (Check Vercel dashboard for current IP)
TTL: Auto
```

**Note:** Vercel's IP addresses can change, so using CNAME for subdomain is recommended.

## Troubleshooting

### Domain Shows "Invalid Configuration"

**Check:**
1. DNS record is added correctly
2. CNAME value matches exactly what Vercel shows
3. DNS has propagated (can take time)
4. No typos in domain name

**Test DNS:**
```bash
# Check if DNS resolves
nslookup reflectie.ontwerpkracht.nl

# Should return Vercel's IP or CNAME
```

### DNS Not Propagating

**Wait longer:**
- Can take up to 48 hours (usually much faster)
- Check from different locations/networks
- Clear DNS cache: `ipconfig /flushdns` (Windows)

### SSL Certificate Issues

**If SSL doesn't work:**
- Wait a few minutes after DNS propagates
- Vercel needs time to issue certificate
- Check Vercel dashboard for certificate status

## Quick Checklist

- [ ] Added domain in Vercel dashboard
- [ ] Copied CNAME value from Vercel
- [ ] Added CNAME record in DNS provider
- [ ] Waited for DNS propagation
- [ ] Verified domain shows "Valid Configuration" in Vercel
- [ ] Tested accessing `https://reflectie.ontwerpkracht.nl`
- [ ] SSL certificate is valid

## After Setup

**Your site will be accessible at:**
- `https://reflectie.ontwerpkracht.nl` (HTTPS - automatic)
- `http://reflectie.ontwerpkracht.nl` (HTTP - redirects to HTTPS)

**Vercel also provides:**
- `your-project.vercel.app` (still works, but custom domain is primary)

## Next Steps

1. Update any hardcoded URLs in your app (if any)
2. Update environment variables if needed
3. Test all functionality with the new domain
4. Update any documentation with the new domain




