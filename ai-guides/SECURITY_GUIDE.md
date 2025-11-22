# Security Guide: Client to Database Connection

## Architecture Overview

```
Client (Browser) → SvelteKit API Routes → Prisma → PostgreSQL Database
```

**Important:** The client never directly connects to the database. All database access goes through your SvelteKit API routes, which run on the server.

## Security Layers

### 1. Database Connection Security

#### SSL/TLS Encryption
Force encrypted connections to your PostgreSQL database:

**Update `.env`:**
```env
# Add ?sslmode=require to force SSL
DATABASE_URL=postgresql://user:password@host:5433/dbname?sslmode=require
DATABASE_URL_ACC=postgresql://user:password@host:5433/dbname?sslmode=require
DATABASE_URL_PROD=postgresql://user:password@host:5432/dbname?sslmode=require
```

**Update `src/lib/server/db/index.ts` to enforce SSL:**
```typescript
export const db = globalForPrisma.prisma ?? new PrismaClient({
  datasources: {
    db: {
      url: databaseUrl.includes('?') 
        ? databaseUrl 
        : `${databaseUrl}?sslmode=require`
    }
  },
  // ... rest of config
});
```

#### Connection Pooling
Prisma handles connection pooling automatically, but you can configure it:
```typescript
// In connection string
DATABASE_URL=postgresql://user:pass@host/db?connection_limit=10&pool_timeout=20
```

#### Network Security
- **Firewall:** Only allow connections from your application server
- **VPN/SSH Tunnel:** Use VPN or SSH tunnel for database access
- **Private Network:** Keep database on private network, not publicly accessible

### 2. API Route Security

#### Authentication & Authorization

**Option A: Session-Based Auth (Recommended for most apps)**
```typescript
// src/routes/api/people/+server.ts
import { error } from '@sveltejs/kit';

export const GET: RequestHandler = async ({ cookies }) => {
  // Check if user is authenticated
  const sessionId = cookies.get('session_id');
  if (!sessionId) {
    throw error(401, 'Unauthorized');
  }
  
  // Verify session and get user
  const user = await verifySession(sessionId);
  if (!user) {
    throw error(401, 'Unauthorized');
  }
  
  // Check permissions
  if (!user.canViewPeople) {
    throw error(403, 'Forbidden');
  }
  
  // ... rest of handler
};
```

**Option B: JWT Tokens**
```typescript
import { error } from '@sveltejs/kit';

export const GET: RequestHandler = async ({ request }) => {
  const token = request.headers.get('Authorization')?.replace('Bearer ', '');
  if (!token) {
    throw error(401, 'Unauthorized');
  }
  
  const user = await verifyJWT(token);
  // ... rest of handler
};
```

**Option C: API Keys (for server-to-server)**
```typescript
export const GET: RequestHandler = async ({ request }) => {
  const apiKey = request.headers.get('X-API-Key');
  if (apiKey !== process.env.API_KEY) {
    throw error(401, 'Invalid API key');
  }
  // ... rest of handler
};
```

#### Input Validation

**Use a validation library (Zod recommended):**
```bash
npm install zod
```

```typescript
// src/lib/validations/person.ts
import { z } from 'zod';

export const createPersonSchema = z.object({
  name: z.string().min(1).max(255),
  age: z.number().int().min(0).max(150),
  city: z.string().min(1).max(255)
});

// In API route
import { createPersonSchema } from '$lib/validations/person';

export const POST: RequestHandler = async ({ request }) => {
  const body = await request.json();
  
  // Validate input
  const validation = createPersonSchema.safeParse(body);
  if (!validation.success) {
    return json({ error: validation.error.errors }, { status: 400 });
  }
  
  const { name, age, city } = validation.data;
  // ... rest of handler
};
```

#### Rate Limiting

**Install rate limiting:**
```bash
npm install @upstash/ratelimit @upstash/redis
# Or use a simpler solution
npm install express-rate-limit
```

**Create rate limiter:**
```typescript
// src/lib/server/rateLimit.ts
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!
});

export const rateLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, '10 s'), // 10 requests per 10 seconds
});

// In API route
export const POST: RequestHandler = async ({ request, getClientAddress }) => {
  const ip = getClientAddress();
  const { success } = await rateLimiter.limit(ip);
  
  if (!success) {
    return json({ error: 'Too many requests' }, { status: 429 });
  }
  // ... rest of handler
};
```

### 3. Error Handling Security

**Never expose sensitive information in errors:**

```typescript
// ❌ BAD - exposes database structure
catch (error) {
  return json({ error: error.message }, { status: 500 });
}

// ✅ GOOD - generic error message
catch (error) {
  console.error('Database error:', error); // Log server-side only
  return json({ error: 'An error occurred' }, { status: 500 });
}
```

### 4. CORS Configuration

**Configure CORS in `src/hooks.server.ts`:**
```typescript
// src/hooks.server.ts
import type { Handle } from '@sveltejs/kit';

export const handle: Handle = async ({ event, resolve }) => {
  // Handle CORS
  if (event.request.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGIN || '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Max-Age': '86400'
      }
    });
  }

  const response = await resolve(event);
  
  // Add CORS headers to response
  response.headers.set('Access-Control-Allow-Origin', process.env.ALLOWED_ORIGIN || '*');
  
  return response;
};
```

### 5. Environment Variables Security

**Never commit secrets:**
- ✅ `.env` is already in `.gitignore`
- ✅ Use `.env.example` for non-sensitive defaults
- ✅ Use environment variables in production (Vercel, etc.)

**Rotate credentials regularly:**
- Change database passwords periodically
- Rotate API keys if compromised

### 6. SQL Injection Prevention

**✅ Already handled by Prisma!**
Prisma uses parameterized queries automatically, preventing SQL injection. However, always validate inputs before passing to Prisma.

### 7. HTTPS/SSL

**Always use HTTPS in production:**
- Your SvelteKit app should be served over HTTPS
- Database connections should use SSL (`?sslmode=require`)
- Use reverse proxy (nginx, Cloudflare) for SSL termination

### 8. Database User Permissions

**Use least privilege principle:**
```sql
-- Create a read-only user for certain operations
CREATE USER readonly_user WITH PASSWORD 'secure_password';
GRANT SELECT ON TABLE people TO readonly_user;

-- Create a write user with limited permissions
CREATE USER app_user WITH PASSWORD 'secure_password';
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE people TO app_user;
```

## Implementation Priority

### High Priority (Do First)
1. ✅ **Input validation** (Zod)
2. ✅ **Error handling** (don't expose sensitive info)
3. ✅ **SSL for database** (`?sslmode=require`)
4. ✅ **Authentication** (if data is sensitive)

### Medium Priority
5. **Rate limiting** (prevent abuse)
6. **CORS configuration** (if needed)
7. **Database user permissions** (least privilege)

### Low Priority (When Scaling)
8. **Connection pooling tuning**
9. **Advanced monitoring/logging**
10. **WAF (Web Application Firewall)**

## Quick Security Checklist

- [ ] Database connection uses SSL (`?sslmode=require`)
- [ ] API routes validate all inputs
- [ ] API routes have authentication (if needed)
- [ ] Error messages don't expose sensitive info
- [ ] Rate limiting implemented
- [ ] CORS configured (if needed)
- [ ] Environment variables never committed
- [ ] Database user has minimal required permissions
- [ ] HTTPS enabled in production
- [ ] Regular security audits

## Example: Secure API Route

```typescript
// src/routes/api/people/+server.ts
import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { createPersonSchema } from '$lib/validations/person';
import { rateLimiter } from '$lib/server/rateLimit';
import { verifySession } from '$lib/server/auth';

export const GET: RequestHandler = async ({ cookies, getClientAddress }) => {
  // Authentication
  const sessionId = cookies.get('session_id');
  if (!sessionId) {
    throw error(401, 'Unauthorized');
  }
  
  const user = await verifySession(sessionId);
  if (!user) {
    throw error(401, 'Unauthorized');
  }
  
  // Rate limiting
  const ip = getClientAddress();
  const { success } = await rateLimiter.limit(ip);
  if (!success) {
    throw error(429, 'Too many requests');
  }
  
  try {
    const people = await db.person.findMany({
      orderBy: { createdAt: 'desc' }
    });
    return json(people);
  } catch (err) {
    console.error('Error fetching people:', err);
    throw error(500, 'Internal server error');
  }
};

export const POST: RequestHandler = async ({ request, cookies, getClientAddress }) => {
  // Authentication
  const sessionId = cookies.get('session_id');
  const user = await verifySession(sessionId);
  if (!user || !user.canCreatePeople) {
    throw error(403, 'Forbidden');
  }
  
  // Rate limiting
  const ip = getClientAddress();
  const { success } = await rateLimiter.limit(ip);
  if (!success) {
    throw error(429, 'Too many requests');
  }
  
  // Input validation
  const body = await request.json();
  const validation = createPersonSchema.safeParse(body);
  if (!validation.success) {
    return json({ error: validation.error.errors }, { status: 400 });
  }
  
  try {
    const person = await db.person.create({
      data: validation.data
    });
    return json(person, { status: 201 });
  } catch (err) {
    console.error('Error creating person:', err);
    throw error(500, 'Internal server error');
  }
};
```

## Additional Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [SvelteKit Security](https://kit.svelte.dev/docs/security)
- [Prisma Security](https://www.prisma.io/docs/guides/performance-and-optimization/connection-management#security)
- [PostgreSQL Security](https://www.postgresql.org/docs/current/security.html)

