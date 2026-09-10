/**
 * Vector & Semantic Memory Search Utilities
 *
 * Provides fast cosine similarity matching and ranking for memory retrieval:
 * - Cosine distance calculation between vectors
 * - Lightweight n-gram & TF-IDF term frequency vectorizer for offline embedding search
 * - Top-K memory ranking
 */

/**
 * Compute the cosine similarity between two numeric vectors.
 * Returns a value between -1.0 and 1.0 (1.0 = identical direction).
 */
export function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length || vecA.length === 0) {
    return 0;
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  if (normA === 0 || normB === 0) {
    return 0;
  }

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Extract word token frequency vector for lightweight offline semantic search.
 */
export function createTermVector(text: string, vocabulary: string[]): number[] {
  const words = text.toLowerCase().match(/\b[a-z0-9_-]+\b/g) || [];
  const freqMap: Record<string, number> = {};
  for (const w of words) {
    freqMap[w] = (freqMap[w] || 0) + 1;
  }

  return vocabulary.map((term) => freqMap[term] || 0);
}

/**
 * Rank a list of candidate items against a query string using term overlap and cosine similarity.
 */
export function rankItemsByRelevance<T extends { text: string }>(
  query: string,
  items: T[],
  limit: number = 5,
): { item: T; score: number }[] {
  if (items.length === 0 || !query.trim()) {
    return items.slice(0, limit).map((item) => ({ item, score: 0 }));
  }

  // Build combined vocabulary
  const vocabSet = new Set<string>();
  const queryWords = query.toLowerCase().match(/\b[a-z0-9_-]+\b/g) || [];
  for (const w of queryWords) vocabSet.add(w);

  for (const item of items) {
    const itemWords = item.text.toLowerCase().match(/\b[a-z0-9_-]+\b/g) || [];
    for (const w of itemWords) vocabSet.add(w);
  }

  const vocabulary = Array.from(vocabSet);
  const queryVector = createTermVector(query, vocabulary);

  const scored = items.map((item) => {
    const itemVector = createTermVector(item.text, vocabulary);
    const score = cosineSimilarity(queryVector, itemVector);
    return { item, score };
  });

  return scored.sort((a, b) => b.score - a.score).slice(0, limit);
}
