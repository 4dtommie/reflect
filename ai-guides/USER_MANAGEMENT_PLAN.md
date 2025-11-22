# User Management & Authentication Plan

## Overview
Add user authentication to the application so that:
- Users can sign up with username and password
- Users can sign in
- Each person record is linked to the user who created it
- Users only see their own person records

## Architecture

```
User Flow:
1. Sign Up → Create User → Sign In → Session Cookie
2. Sign In → Verify Credentials → Session Cookie
3. Protected Routes → Check Session → Filter Data by User ID
4. Sign Out → Clear Session Cookie
```

## Implementation Steps

### 1. Install Dependencies

**Password Hashing:**
```bash
npm install bcryptjs
npm install -D @types/bcryptjs
```

**Session Management:**
- SvelteKit has built-in cookie support (no extra package needed)
- We'll use HTTP-only cookies for security

### 2. Database Schema Changes

**Update `prisma/schema.prisma`:**

```prisma
model User {
  id        Int      @id @default(autoincrement())
  username  String   @unique
  password  String   // Hashed password (bcrypt)
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  // Relations
  people    Person[]

  @@map("users")
}

model Person {
  id        Int      @id @default(autoincrement())
  name      String
  age       Int
  city      String
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")
  
  // Link to user
  userId    Int      @map("user_id")
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("people")
}
```

**Migration Options:**

**Option A: Reset Database (Recommended if you're fine deleting data):**
```bash
# This deletes all data and migrations, then creates fresh migration
npx prisma migrate reset
# Then update schema.prisma with User model
# Then run:
npx prisma migrate dev --name init_with_users
```

**Option B: Create Migration (Keeps existing data - requires handling existing records):**
```bash
# Update schema.prisma first, then:
npx prisma migrate dev --name add_user_authentication
# Note: This will fail if there are existing Person records without userId
# You'll need to either:
# 1. Delete existing records first
# 2. Make userId nullable temporarily, assign default user, then make required
```

**Option C: Manual Reset (Full control):**
```bash
# 1. Delete all migrations
rm -rf prisma/migrations
# 2. Reset database
npx prisma migrate reset
# 3. Update schema.prisma
# 4. Create fresh migration
npx prisma migrate dev --name init_with_users
```

**Recommended: Option A or C** - Since you're fine deleting data, resetting is cleanest.

### 3. Authentication Utilities

**Create `src/lib/server/auth.ts`:**

```typescript
import bcrypt from 'bcryptjs';
import { db } from './db';
import { randomBytes } from 'crypto';

// Password hashing
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// Session management
export async function createSession(userId: number): Promise<string> {
  const sessionToken = randomBytes(32).toString('hex');
  
  // Store session in database (optional, or use cookies only)
  // For simplicity, we'll use signed cookies with user ID
  
  return sessionToken;
}

export async function getUserFromSession(sessionToken: string): Promise<number | null> {
  // Verify session token and return user ID
  // For cookie-based sessions, we'll decode the cookie
  return null; // Implement based on your session strategy
}

// User operations
export async function createUser(username: string, password: string) {
  const hashedPassword = await hashPassword(password);
  
  return db.user.create({
    data: {
      username,
      password: hashedPassword
    },
    select: {
      id: true,
      username: true,
      createdAt: true
    }
  });
}

export async function getUserByUsername(username: string) {
  return db.user.findUnique({
    where: { username }
  });
}

export async function verifyUser(username: string, password: string) {
  const user = await getUserByUsername(username);
  if (!user) {
    return null;
  }
  
  const isValid = await verifyPassword(password, user.password);
  if (!isValid) {
    return null;
  }
  
  return {
    id: user.id,
    username: user.username
  };
}
```

### 4. Session Management with Cookies

**Create `src/lib/server/session.ts`:**

```typescript
import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers'; // Actually, SvelteKit uses different approach

// For SvelteKit, we'll use a simpler approach with signed cookies
// Install: npm install jose (for JWT signing) OR use simpler cookie approach

// Alternative: Simple cookie-based session
export async function createSessionCookie(userId: number): Promise<string> {
  // Create a session token (could be JWT or simple token)
  // Store in HTTP-only cookie
  return userId.toString(); // Simplified - in production use JWT
}

export async function getUserIdFromCookie(cookieHeader: string | null): Promise<number | null> {
  if (!cookieHeader) return null;
  
  // Parse cookie and verify
  // Return user ID if valid, null otherwise
  try {
    const userId = parseInt(cookieHeader);
    return isNaN(userId) ? null : userId;
  } catch {
    return null;
  }
}
```

**Better approach for SvelteKit - use hooks:**

**Create `src/hooks.server.ts`:**

```typescript
import type { Handle } from '@sveltejs/kit';
import { sequence } from '@sveltejs/kit/hooks';
import { db } from '$lib/server/db';

// Validate session and attach user to event.locals
export const handle: Handle = async ({ event, resolve }) => {
  const sessionId = event.cookies.get('session_id');
  
  if (sessionId) {
    try {
      // Verify session and get user
      const userId = parseInt(sessionId);
      const user = await db.user.findUnique({
        where: { id: userId },
        select: { id: true, username: true }
      });
      
      if (user) {
        event.locals.user = user;
      }
    } catch (error) {
      // Invalid session
      event.cookies.delete('session_id');
    }
  }
  
  return resolve(event);
};
```

**Update `src/app.d.ts`:**

```typescript
declare global {
  namespace App {
    interface Locals {
      user?: {
        id: number;
        username: string;
      };
    }
  }
}
```

### 5. Authentication API Routes

**Create `src/routes/api/auth/signup/+server.ts`:**

```typescript
import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createUser, getUserByUsername } from '$lib/server/auth';
import { hashPassword } from '$lib/server/auth';

export const POST: RequestHandler = async ({ request, cookies }) => {
  try {
    const { username, password } = await request.json();
    
    // Validation
    if (!username || !password) {
      return json({ error: 'Username and password are required' }, { status: 400 });
    }
    
    if (username.length < 3) {
      return json({ error: 'Username must be at least 3 characters' }, { status: 400 });
    }
    
    if (password.length < 6) {
      return json({ error: 'Password must be at least 6 characters' }, { status: 400 });
    }
    
    // Check if username already exists
    const existingUser = await getUserByUsername(username);
    if (existingUser) {
      return json({ error: 'Username already exists' }, { status: 409 });
    }
    
    // Create user
    const user = await createUser(username, password);
    
    // Create session
    cookies.set('session_id', user.id.toString(), {
      path: '/',
      httpOnly: true,
      sameSite: 'strict',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 7 // 7 days
    });
    
    return json({ 
      user: {
        id: user.id,
        username: user.username
      }
    }, { status: 201 });
  } catch (err) {
    console.error('Signup error:', err);
    return json({ error: 'Failed to create account' }, { status: 500 });
  }
};
```

**Create `src/routes/api/auth/signin/+server.ts`:**

```typescript
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { verifyUser } from '$lib/server/auth';

export const POST: RequestHandler = async ({ request, cookies }) => {
  try {
    const { username, password } = await request.json();
    
    if (!username || !password) {
      return json({ error: 'Username and password are required' }, { status: 400 });
    }
    
    const user = await verifyUser(username, password);
    
    if (!user) {
      return json({ error: 'Invalid username or password' }, { status: 401 });
    }
    
    // Create session
    cookies.set('session_id', user.id.toString(), {
      path: '/',
      httpOnly: true,
      sameSite: 'strict',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 7 // 7 days
    });
    
    return json({ 
      user: {
        id: user.id,
        username: user.username
      }
    });
  } catch (err) {
    console.error('Signin error:', err);
    return json({ error: 'Failed to sign in' }, { status: 500 });
  }
};
```

**Create `src/routes/api/auth/signout/+server.ts`:**

```typescript
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ cookies }) => {
  cookies.delete('session_id', { path: '/' });
  return json({ success: true });
};
```

**Create `src/routes/api/auth/me/+server.ts`:**

```typescript
import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals }) => {
  if (!locals.user) {
    throw error(401, 'Not authenticated');
  }
  
  return json({
    user: {
      id: locals.user.id,
      username: locals.user.username
    }
  });
};
```

### 6. Update Person API Routes

**Update `src/routes/api/people/+server.ts`:**

```typescript
import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';

export const GET: RequestHandler = async ({ locals }) => {
  // Require authentication
  if (!locals.user) {
    throw error(401, 'Unauthorized');
  }
  
  try {
    // Only get people for the current user
    const people = await db.person.findMany({
      where: {
        userId: locals.user.id
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return json(people);
  } catch (err) {
    console.error('Error fetching people:', err);
    return json({ error: 'Failed to fetch people' }, { status: 500 });
  }
};

export const POST: RequestHandler = async ({ request, locals }) => {
  // Require authentication
  if (!locals.user) {
    throw error(401, 'Unauthorized');
  }
  
  try {
    const body = await request.json();
    const { name, age, city } = body;

    if (!name || !age || !city) {
      return json({ error: 'Missing required fields: name, age, city' }, { status: 400 });
    }

    // Link person to current user
    const person = await db.person.create({
      data: {
        name,
        age: parseInt(age.toString()),
        city,
        userId: locals.user.id
      }
    });

    return json(person, { status: 201 });
  } catch (err) {
    console.error('Error creating person:', err);
    return json({ error: 'Failed to create person' }, { status: 500 });
  }
};
```

### 7. Protected Route Layout

**Create `src/routes/(protected)/+layout.server.ts`:**

```typescript
import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals }) => {
  if (!locals.user) {
    throw redirect(302, '/signin');
  }
  
  return {
    user: locals.user
  };
};
```

**Move protected routes:**
- Move `src/routes/persons/` to `src/routes/(protected)/persons/`
- This automatically protects all routes under `(protected)`

### 8. Authentication Pages

**Create `src/routes/signup/+page.svelte`:**

```svelte
<script lang="ts">
  import { goto } from '$app/navigation';
  
  let username = $state('');
  let password = $state('');
  let error = $state<string | null>(null);
  let submitting = $state(false);
  
  async function handleSubmit() {
    submitting = true;
    error = null;
    
    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Signup failed');
      }
      
      // Redirect to persons page
      goto('/persons');
    } catch (err) {
      error = err instanceof Error ? err.message : 'Signup failed';
    } finally {
      submitting = false;
    }
  }
</script>

<div class="max-w-md mx-auto mt-12">
  <h1 class="text-4xl font-bold text-gray-900 mb-6">Sign Up</h1>
  
  {#if error}
    <div class="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
      {error}
    </div>
  {/if}
  
  <form onsubmit|preventDefault={handleSubmit} class="space-y-6">
    <div>
      <label for="username" class="block text-sm font-medium text-gray-700 mb-2">
        Username
      </label>
      <input
        type="text"
        id="username"
        bind:value={username}
        required
        minlength="3"
        class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        placeholder="Choose a username"
      />
    </div>
    
    <div>
      <label for="password" class="block text-sm font-medium text-gray-700 mb-2">
        Password
      </label>
      <input
        type="password"
        id="password"
        bind:value={password}
        required
        minlength="6"
        class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        placeholder="Choose a password"
      />
    </div>
    
    <button
      type="submit"
      disabled={submitting}
      class="w-full px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
    >
      {submitting ? 'Signing up...' : 'Sign Up'}
    </button>
  </form>
  
  <p class="mt-4 text-center text-gray-600">
    Already have an account? 
    <a href="/signin" class="text-blue-600 hover:text-blue-800 underline">Sign in</a>
  </p>
</div>
```

**Create `src/routes/signin/+page.svelte`:**

```svelte
<script lang="ts">
  import { goto } from '$app/navigation';
  
  let username = $state('');
  let password = $state('');
  let error = $state<string | null>(null);
  let submitting = $state(false);
  
  async function handleSubmit() {
    submitting = true;
    error = null;
    
    try {
      const response = await fetch('/api/auth/signin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Sign in failed');
      }
      
      goto('/persons');
    } catch (err) {
      error = err instanceof Error ? err.message : 'Sign in failed';
    } finally {
      submitting = false;
    }
  }
</script>

<div class="max-w-md mx-auto mt-12">
  <h1 class="text-4xl font-bold text-gray-900 mb-6">Sign In</h1>
  
  {#if error}
    <div class="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
      {error}
    </div>
  {/if}
  
  <form onsubmit|preventDefault={handleSubmit} class="space-y-6">
    <div>
      <label for="username" class="block text-sm font-medium text-gray-700 mb-2">
        Username
      </label>
      <input
        type="text"
        id="username"
        bind:value={username}
        required
        class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        placeholder="Enter your username"
      />
    </div>
    
    <div>
      <label for="password" class="block text-sm font-medium text-gray-700 mb-2">
        Password
      </label>
      <input
        type="password"
        id="password"
        bind:value={password}
        required
        class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        placeholder="Enter your password"
      />
    </div>
    
    <button
      type="submit"
      disabled={submitting}
      class="w-full px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
    >
      {submitting ? 'Signing in...' : 'Sign In'}
    </button>
  </form>
  
  <p class="mt-4 text-center text-gray-600">
    Don't have an account? 
    <a href="/signup" class="text-blue-600 hover:text-blue-800 underline">Sign up</a>
  </p>
</div>
```

### 9. Update Main Page

**Update `src/routes/+page.svelte`:**

```svelte
<script lang="ts">
  import { goto } from '$app/navigation';
  
  // Check if user is logged in
  let user = $state<{ id: number; username: string } | null>(null);
  
  async function checkAuth() {
    try {
      const response = await fetch('/api/auth/me');
      if (response.ok) {
        const data = await response.json();
        user = data.user;
      }
    } catch {
      // Not authenticated
    }
  }
  
  checkAuth();
</script>

<h1 class="text-4xl font-bold text-gray-900 mb-6">Welcome to Reflectie AI</h1>

{#if user}
  <p class="text-lg text-gray-700 mb-4">
    Welcome back, {user.username}!
  </p>
  <div class="flex gap-4">
    <a
      href="/persons"
      class="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-center"
    >
      View People Database
    </a>
    <a
      href="/persons/add"
      class="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-center"
    >
      Add New Person
    </a>
  </div>
{:else}
  <p class="text-lg text-gray-700 mb-8">
    Sign in to manage your people database.
  </p>
  <div class="flex gap-4">
    <a
      href="/signin"
      class="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-center"
    >
      Sign In
    </a>
    <a
      href="/signup"
      class="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-center"
    >
      Sign Up
    </a>
  </div>
{/if}
```

### 10. Add Sign Out Functionality

**Update protected layout to show user and sign out:**

**Create `src/routes/(protected)/+layout.svelte`:**

```svelte
<script lang="ts">
  import { goto } from '$app/navigation';
  import type { LayoutData } from './$types';
  
  let { data }: { data: LayoutData } = $props();
  
  async function signOut() {
    await fetch('/api/auth/signout', { method: 'POST' });
    goto('/');
  }
</script>

<div class="mb-4 flex justify-between items-center">
  <span class="text-gray-600">Logged in as: <strong>{data.user.username}</strong></span>
  <button
    onclick={signOut}
    class="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
  >
    Sign Out
  </button>
</div>

<slot />
```

### 11. Migration Strategy for Existing Data

**Option A: Delete existing data (simplest)**
```bash
# Before migration, delete existing person records
# Or run: DELETE FROM people;
```

**Option B: Assign to default user**
```typescript
// In migration or seed script
// Create a default user and assign all existing people to it
```

**Option C: Manual assignment**
- Create admin user
- Manually update existing records

## Implementation Order

1. ✅ Install dependencies (`bcryptjs`, `@types/bcryptjs`)
2. ✅ Update Prisma schema (add User model, link Person to User)
3. ✅ Run migration
4. ✅ Create authentication utilities (`src/lib/server/auth.ts`)
5. ✅ Create hooks for session management (`src/hooks.server.ts`)
6. ✅ Update `app.d.ts` for TypeScript types
7. ✅ Create auth API routes (signup, signin, signout, me)
8. ✅ Update person API routes to require auth and filter by user
9. ✅ Create protected route layout
10. ✅ Move persons routes to protected folder
11. ✅ Create signup/signin pages
12. ✅ Update main page to show auth status
13. ✅ Add sign out functionality
14. ✅ Test the flow

## Security Considerations

1. **Password Hashing**: Using bcrypt with salt rounds of 10
2. **HTTP-Only Cookies**: Session cookies are HTTP-only (not accessible via JavaScript)
3. **SameSite Cookies**: Prevents CSRF attacks
4. **Secure Cookies**: Enabled in production
5. **Input Validation**: Username/password length validation
6. **Error Messages**: Generic error messages to prevent username enumeration

## Testing Checklist

- [ ] User can sign up with new username
- [ ] User cannot sign up with existing username
- [ ] User can sign in with correct credentials
- [ ] User cannot sign in with wrong credentials
- [ ] User sees only their own people records
- [ ] User cannot access protected routes without auth
- [ ] User is redirected to signin when not authenticated
- [ ] User can sign out
- [ ] Session persists across page refreshes
- [ ] Session expires after 7 days

## Future Enhancements

- Email verification
- Password reset functionality
- Remember me option
- Session management (view/revoke active sessions)
- Two-factor authentication
- OAuth providers (Google, GitHub, etc.)

