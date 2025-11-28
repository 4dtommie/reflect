# OpenAI Batch API Guide

## What is the Batch API?

The OpenAI Batch API is a **cost-effective, asynchronous processing system** for handling large volumes of API requests. Instead of making individual API calls (synchronous), you submit a batch file with many requests, and OpenAI processes them within 24 hours at **50% discount**.

### Key Concept

**Regular API (Synchronous):**
```
Request 1 → Wait → Response 1
Request 2 → Wait → Response 2
Request 3 → Wait → Response 3
...
Cost: Full price, immediate results
```

**Batch API (Asynchronous):**
```
Upload batch file (1000 requests)
  ↓
Wait up to 24 hours
  ↓
Download results file
Cost: 50% discount, delayed results
```

## Key Features

### 1. **50% Cost Discount**
- Same quality results
- Half the price
- Best for bulk operations

### 2. **Higher Rate Limits**
- Up to **50,000 requests** per batch
- Input file up to **200 MB**
- Separate rate limit pool (doesn't affect regular API limits)

### 3. **Asynchronous Processing**
- Processed within **24 hours**
- No need to wait or monitor
- Results available when ready

### 4. **Same Models & Endpoints**
- Supports most models (`gpt-5-nano`, `gpt-5-mini`, `gpt-5`, `gpt-4o-mini`, `gpt-4o`, `gpt-4`, etc.)
- Works with `/v1/chat/completions` (what we use)
- Same prompt format, same responses

## How It Works

### Step-by-Step Process

1. **Prepare Batch File (JSONL format)**
   - Create a `.jsonl` file (JSON Lines)
   - Each line = one API request
   - Include `custom_id` for tracking

2. **Upload File**
   - Use Files API to upload
   - Get file ID

3. **Create Batch**
   - Submit batch job with file ID
   - Get batch ID

4. **Monitor Status**
   - Check batch status (validating → in_progress → finalizing → completed)
   - Can take minutes to 24 hours

5. **Download Results**
   - When completed, download output file
   - Parse results and update database

## JSONL File Format

### What is JSONL?

**JSONL (JSON Lines)** = One JSON object per line

**Example:**
```jsonl
{"custom_id": "tx-1", "method": "POST", "url": "/v1/chat/completions", "body": {"model": "gpt-4o-mini", "messages": [...]}}
{"custom_id": "tx-2", "method": "POST", "url": "/v1/chat/completions", "body": {"model": "gpt-4o-mini", "messages": [...]}}
{"custom_id": "tx-3", "method": "POST", "url": "/v1/chat/completions", "body": {"model": "gpt-4o-mini", "messages": [...]}}
```

### Structure

Each line must have:
- `custom_id`: Unique identifier (string, max 64 chars)
- `method`: HTTP method (usually "POST")
- `url`: API endpoint (e.g., "/v1/chat/completions")
- `body`: Request body (same as regular API call)

### Example for Transaction Categorization

```jsonl
{"custom_id": "batch-1-tx-123", "method": "POST", "url": "/v1/chat/completions", "body": {"model": "gpt-5-mini", "temperature": 0.3, "max_tokens": 2000, "response_format": {"type": "json_object"}, "messages": [{"role": "system", "content": "You are a financial transaction categorizer..."}, {"role": "user", "content": "INCOME CATEGORIES:\n1. Salary - Regular employment income\n..."}]}}
{"custom_id": "batch-1-tx-124", "method": "POST", "url": "/v1/chat/completions", "body": {"model": "gpt-4o-mini", "temperature": 0.3, "max_tokens": 2000, "response_format": {"type": "json_object"}, "messages": [{"role": "system", "content": "You are a financial transaction categorizer..."}, {"role": "user", "content": "INCOME CATEGORIES:\n1. Salary - Regular employment income\n..."}]}}
```

**Note:** In practice, you'd batch multiple transactions per request (like we do now), so each line would contain 10 transactions.

## Implementation Example

### TypeScript/Node.js Implementation

```typescript
import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

interface BatchRequest {
  custom_id: string;
  method: string;
  url: string;
  body: {
    model: string;
    messages: Array<{ role: string; content: string }>;
    temperature?: number;
    max_tokens?: number;
    response_format?: { type: string };
  };
}

/**
 * Create a batch file from transactions
 */
async function createBatchFile(
  transactions: TransactionForAI[],
  categories: CategoryForAI[],
  batchSize: number = 10
): Promise<string> {
  // Split into batches
  const batches = batchTransactions(transactions, batchSize);
  
  // Create JSONL content
  const lines: string[] = [];
  
  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    const prompt = createCategorizationPrompt(categories, batch);
    
    const request: BatchRequest = {
      custom_id: `batch-${Date.now()}-${i}`,
      method: 'POST',
      url: '/v1/chat/completions',
      body: {
        model: 'gpt-5-mini', // Or gpt-5-nano, gpt-5, gpt-4o-mini, etc.
        temperature: 0.3,
        max_tokens: 2000,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content: 'You are a financial transaction categorizer. Return JSON only.'
          },
          {
            role: 'user',
            content: prompt
          }
        ]
      }
    };
    
    lines.push(JSON.stringify(request));
  }
  
  // Write to temporary file
  const filePath = path.join('/tmp', `batch-${Date.now()}.jsonl`);
  fs.writeFileSync(filePath, lines.join('\n'));
  
  return filePath;
}

/**
 * Upload batch file and create batch job
 */
async function createBatchJob(filePath: string): Promise<string> {
  // 1. Upload file
  const file = await openai.files.create({
    file: fs.createReadStream(filePath),
    purpose: 'batch'
  });
  
  console.log(`📤 Uploaded batch file: ${file.id}`);
  
  // 2. Create batch
  const batch = await openai.batches.create({
    input_file_id: file.id,
    endpoint: '/v1/chat/completions',
    completion_window: '24h'
  });
  
  console.log(`🚀 Created batch job: ${batch.id}`);
  console.log(`   Status: ${batch.status}`);
  
  return batch.id;
}

/**
 * Check batch status
 */
async function checkBatchStatus(batchId: string) {
  const batch = await openai.batches.retrieve(batchId);
  
  return {
    id: batch.id,
    status: batch.status, // validating | in_progress | finalizing | completed | expired | cancelled | failed
    totalRequests: batch.request_counts?.total,
    completedRequests: batch.request_counts?.completed,
    failedRequests: batch.request_counts?.failed,
    outputFileId: batch.output_file_id,
    errorFileId: batch.error_file_id,
    expiresAt: batch.expires_at,
    completedAt: batch.completed_at
  };
}

/**
 * Download and parse results
 */
async function downloadBatchResults(batchId: string): Promise<AICategorizationResult[]> {
  const batch = await openai.batches.retrieve(batchId);
  
  if (batch.status !== 'completed') {
    throw new Error(`Batch not completed yet. Status: ${batch.status}`);
  }
  
  if (!batch.output_file_id) {
    throw new Error('No output file available');
  }
  
  // Download output file
  const file = await openai.files.retrieveContent(batch.output_file_id);
  const lines = file.split('\n').filter(line => line.trim());
  
  // Parse results
  const results: AICategorizationResult[] = [];
  
  for (const line of lines) {
    const response = JSON.parse(line);
    
    if (response.response?.body?.results) {
      // Extract results from batch response
      const batchResults = response.response.body.results;
      results.push(...batchResults);
    } else if (response.error) {
      console.error(`Error in batch request ${response.custom_id}:`, response.error);
    }
  }
  
  return results;
}

/**
 * Complete workflow
 */
async function categorizeWithBatchAPI(
  userId: number,
  transactions: TransactionForAI[]
): Promise<AICategorizationResult[]> {
  // 1. Load categories
  const categories = await loadCategoriesForAI(userId);
  
  // 2. Create batch file
  const filePath = await createBatchFile(transactions, categories);
  
  // 3. Upload and create batch
  const batchId = await createBatchJob(filePath);
  
  // 4. Poll for completion (or return batch ID for async processing)
  let status = await checkBatchStatus(batchId);
  
  while (status.status !== 'completed' && status.status !== 'failed' && status.status !== 'expired') {
    console.log(`⏳ Batch ${batchId}: ${status.status} (${status.completedRequests}/${status.totalRequests})`);
    await new Promise(resolve => setTimeout(resolve, 60000)); // Wait 1 minute
    status = await checkBatchStatus(batchId);
  }
  
  if (status.status === 'completed') {
    // 5. Download results
    return await downloadBatchResults(batchId);
  } else {
    throw new Error(`Batch ${batchId} failed with status: ${status.status}`);
  }
}
```

## Batch Status States

1. **validating**: Batch file is being validated
2. **in_progress**: Batch is being processed
3. **finalizing**: Batch is almost done, finalizing results
4. **completed**: ✅ All done, results available
5. **expired**: ⏰ Took longer than 24 hours, incomplete requests cancelled
6. **cancelled**: ❌ Manually cancelled
7. **failed**: ❌ Batch failed (check error file)

## When to Use Batch API

### ✅ Use Batch API When:

- **Large datasets** (1000+ transactions)
- **Cost is important** (50% discount)
- **Immediate results not needed** (can wait up to 24h)
- **Bulk operations** (categorizing entire account history)
- **Background jobs** (scheduled categorization)

### ❌ Don't Use Batch API When:

- **Real-time processing** needed
- **Small datasets** (<100 transactions)
- **User is waiting** (interactive categorization)
- **Time-sensitive** operations

## Cost Comparison

### Example: 1000 Transactions

**Regular API (Sequential):**
- Batch size: 10 transactions per call
- Batches: 100 API calls
- Cost per batch: ~$0.0005
- **Total: ~$0.05**
- Time: ~13 minutes (800ms per call)

**Regular API (Parallel, 3 concurrent):**
- Batches: 100 API calls
- Cost per batch: ~$0.0005
- **Total: ~$0.05**
- Time: ~4 minutes

**Batch API:**
- Batches: 100 requests in batch file
- Cost per batch: ~$0.00025 (50% discount)
- **Total: ~$0.025** (50% savings!)
- Time: Up to 24 hours (usually completes in 1-2 hours)

### Savings

- **1000 transactions:** Save $0.025 (50%)
- **10,000 transactions:** Save $0.25 (50%)
- **100,000 transactions:** Save $2.50 (50%)

## Limitations & Considerations

### 1. **24-Hour Window**
- Batches must complete within 24 hours
- Expired batches cancel unfinished requests
- Only completed requests are charged

### 2. **File Size Limits**
- Max 200 MB input file
- Max 50,000 requests per batch
- Token limits per model (check your tier)

### 3. **No Streaming**
- Can't stream responses
- Must wait for complete batch

### 4. **Error Handling**
- Errors written to separate error file
- Need to check both output and error files
- Failed requests don't block others

### 5. **Status Polling**
- Need to poll for status
- Can't get real-time updates
- Best for background jobs

## Integration Strategy

### Option 1: Hybrid Approach

**For real-time categorization:**
- Use regular API (sequential or parallel)
- Fast, immediate results

**For bulk operations:**
- Use Batch API
- Background job, 50% discount

### Option 2: User Choice

Let users choose:
- **"Categorize now"** → Regular API (fast, full price)
- **"Categorize in background"** → Batch API (slow, 50% discount)

### Option 3: Automatic Selection

```typescript
function shouldUseBatchAPI(transactionCount: number): boolean {
  // Use batch API for large datasets
  return transactionCount >= 500;
}

async function categorizeTransactions(
  userId: number,
  transactions: TransactionForAI[]
): Promise<AICategorizationResult[]> {
  if (shouldUseBatchAPI(transactions.length)) {
    // Large dataset → Batch API
    return await categorizeWithBatchAPI(userId, transactions);
  } else {
    // Small dataset → Regular API
    return await categorizeWithRegularAPI(userId, transactions);
  }
}
```

## Database Schema for Batch Jobs

If implementing batch API, consider tracking batch jobs:

```prisma
model BatchJob {
  id            String   @id @default(cuid())
  userId        Int
  batchId       String   @unique // OpenAI batch ID
  status        String   // validating | in_progress | completed | failed
  totalRequests Int
  completedAt   DateTime?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  
  user          User     @relation(fields: [userId], references: [id])
  
  @@index([userId])
  @@index([status])
}
```

## Monitoring & Notifications

### Polling Strategy

```typescript
// Check batch status every 5 minutes
async function pollBatchStatus(batchId: string) {
  const status = await checkBatchStatus(batchId);
  
  if (status.status === 'completed') {
    // Notify user, process results
    await notifyUser(userId, 'Batch categorization completed!');
    await processBatchResults(batchId);
  } else if (status.status === 'failed' || status.status === 'expired') {
    // Notify user of failure
    await notifyUser(userId, 'Batch categorization failed. Please try again.');
  } else {
    // Schedule next check
    setTimeout(() => pollBatchStatus(batchId), 5 * 60 * 1000);
  }
}
```

### Webhook Alternative

OpenAI doesn't provide webhooks for batch completion, so polling is necessary.

## Best Practices

1. **Batch Size**: Keep same batch size (10 transactions) for consistency
2. **Custom IDs**: Use meaningful IDs (e.g., `batch-{timestamp}-{index}`)
3. **Error Handling**: Always check error file for failed requests
4. **Status Polling**: Poll every 1-5 minutes (don't spam)
5. **Cleanup**: Delete temporary files after upload
6. **Retry Logic**: If batch expires, retry with smaller batches
7. **Cost Tracking**: Log costs for monitoring

## Resources

- **Official Docs:** https://platform.openai.com/docs/guides/batch
- **Batch API Reference:** https://platform.openai.com/docs/api-reference/batch
- **FAQ:** https://help.openai.com/en/articles/9197833-batch-api-faq
- **Getting Started:** https://platform.openai.com/docs/guides/batch/getting-started

## Summary

**Batch API is perfect for:**
- ✅ Large-scale categorization (1000+ transactions)
- ✅ Background jobs
- ✅ Cost optimization (50% discount)
- ✅ Non-urgent processing

**Not suitable for:**
- ❌ Real-time categorization
- ❌ Small datasets
- ❌ User-facing operations

**Recommendation:** Implement as an **optional feature** for bulk operations, while keeping regular API for real-time categorization.

