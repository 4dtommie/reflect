-- Enable pgvector extension for vector similarity search
CREATE EXTENSION IF NOT EXISTS vector;

-- Add embedding column to categories table
-- Using vector(1536) for OpenAI text-embedding-3-small model
ALTER TABLE "categories" ADD COLUMN "embedding" vector(1536);

-- Add timestamp to track when embedding was last generated/updated
ALTER TABLE "categories" ADD COLUMN "embedding_updated_at" TIMESTAMP(3);

-- Create index for efficient similarity search using cosine distance
-- Using HNSW index (better for small-medium datasets, faster queries)
CREATE INDEX "categories_embedding_idx" ON "categories" USING hnsw ("embedding" vector_cosine_ops);

