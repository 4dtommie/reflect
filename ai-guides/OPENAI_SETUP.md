# OpenAI API Setup Guide

This guide explains how to configure the OpenAI API key for AI-powered transaction categorization.

## Quick Setup

### 1. Get Your OpenAI API Key

1. Go to [OpenAI Platform](https://platform.openai.com/)
2. Sign in or create an account
3. Navigate to [API Keys](https://platform.openai.com/api-keys)
4. Click "Create new secret key"
5. Copy the key (it starts with `sk-`)
6. **Important:** Save it immediately - you won't be able to see it again!

### 2. Local Development Setup

Create a `.env` file in the project root (if it doesn't exist):

```bash
# Copy the example file
cp .env.example .env
```

Then edit `.env` and add your API key:

```env
OPENAI_API_KEY=sk-your-actual-api-key-here
```

**Note:** The `.env` file is already in `.gitignore`, so it won't be committed to git.

### 3. Vercel Production Setup

If you're deploying to Vercel, you need to add the environment variable there:

1. Go to your [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project
3. Go to **Settings** → **Environment Variables**
4. Click **Add New**
5. Add:
   - **Name:** `OPENAI_API_KEY`
   - **Value:** Your API key (starts with `sk-`)
   - **Environment:** Select all (Production, Preview, Development)
6. Click **Save**

After adding the variable, you may need to redeploy your project for it to take effect.

### 4. Optional Configuration

You can customize the AI behavior by setting these optional environment variables:

```env
# Model to use (default: gpt-5-mini)
# Options: 
#   GPT-5: gpt-5-nano (most economical), gpt-5-mini (recommended), gpt-5 (highest accuracy)
#   Previous gen: gpt-4o-mini (cheap, fast), gpt-4o (more accurate, expensive)
OPENAI_MODEL=gpt-5-mini

# Maximum tokens per request (default: 2000)
OPENAI_MAX_TOKENS=2000

# Temperature (0.0-1.0, default: 0.3)
# Lower = more consistent, Higher = more creative
OPENAI_TEMPERATURE=0.3

# Number of transactions per API call (default: 15)
# Larger = fewer API calls = lower cost, but more tokens per call
OPENAI_BATCH_SIZE=15

# Retry settings (defaults shown)
OPENAI_MAX_RETRIES=3
OPENAI_RETRY_DELAY=1000
```

## Verification

To verify the API key is working:

1. Start your development server: `npm run dev`
2. Go to the categorization page: `/enrich/categorize`
3. Click "Start categorization"
4. If the API key is set correctly, you should see AI categorization happening
5. Check the browser console and server logs for any errors

## Cost Information

### Model Costs (as of 2025)

**GPT-5 Models (Newest, Recommended):**
- **gpt-5-nano:** Check OpenAI pricing (most economical)
- **gpt-5-mini:** Check OpenAI pricing (recommended default) ⭐
- **gpt-5:** Check OpenAI pricing (highest accuracy)

**Previous Generation:**
- **gpt-4o-mini:**
  - Input: ~$0.15 per 1M tokens
  - Output: ~$0.60 per 1M tokens
  - Still good, previous generation

- **gpt-4o:**
  - Input: ~$2.50 per 1M tokens
  - Output: ~$10.00 per 1M tokens
  - More accurate but much more expensive

**Note:** Check https://openai.com/api/pricing/ for current GPT-5 pricing.

### Estimated Costs

**Example costs (verify with OpenAI pricing):**
- **Per batch (15 transactions):** Very low cost
- **Per 1000 transactions:** Typically $0.01-$0.05
- **Per 10,000 transactions:** Typically $0.10-$0.50

**Note:** GPT-5 models may offer better cost efficiency. Check current pricing at https://openai.com/api/pricing/

The system uses keyword matching first (free), so AI is only used for unmatched transactions, keeping costs low.

## Troubleshooting

### "OPENAI_API_KEY is not set"

**Solution:** Make sure you've created a `.env` file in the project root with your API key.

### "Invalid API key"

**Solution:** 
- Check that your API key starts with `sk-`
- Verify the key is correct (no extra spaces)
- Make sure you haven't exceeded your OpenAI account limits

### "Rate limit exceeded"

**Solution:**
- The system will automatically retry with exponential backoff
- If this happens frequently, consider:
  - Reducing `OPENAI_BATCH_SIZE`
  - Increasing `OPENAI_RETRY_DELAY`
  - Upgrading your OpenAI plan

### API key not working in production (Vercel)

**Solution:**
1. Verify the environment variable is set in Vercel dashboard
2. Make sure it's set for the correct environment (Production/Preview/Development)
3. Redeploy your project after adding the variable
4. Check Vercel logs for any errors

## Security Notes

- **Never commit your API key to git** - it's already in `.gitignore`
- **Don't share your API key** - treat it like a password
- **Rotate keys regularly** - if a key is compromised, revoke it and create a new one
- **Set usage limits** - in OpenAI dashboard, set monthly spending limits to prevent unexpected costs

## Next Steps

Once the API key is configured:
1. The system will automatically use AI for unmatched transactions
2. Suggested keywords will be automatically added to categories
3. Check the categorization page to see AI categorization in action

For more details, see [AI_CATEGORIZATION_IMPLEMENTATION_PLAN.md](./AI_CATEGORIZATION_IMPLEMENTATION_PLAN.md)

