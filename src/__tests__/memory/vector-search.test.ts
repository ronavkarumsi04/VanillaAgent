import { describe, it, expect } from "vitest";
import { cosineSimilarity, createTermVector, rankItemsByRelevance } from "../../memory/vector-search.js";

describe("memory/vector-search", () => {
  describe("cosineSimilarity", () => {
    it("returns 1.0 for identical vectors", () => {
      const v1 = [1, 2, 3];
      const v2 = [1, 2, 3];
      expect(cosineSimilarity(v1, v2)).toBeCloseTo(1.0, 5);
    });

    it("returns 0.0 for orthogonal vectors", () => {
      const v1 = [1, 0];
      const v2 = [0, 1];
      expect(cosineSimilarity(v1, v2)).toBeCloseTo(0.0, 5);
    });

    it("handles zero vectors safely without division by zero", () => {
      const v1 = [0, 0, 0];
      const v2 = [1, 2, 3];
      expect(cosineSimilarity(v1, v2)).toBe(0);
    });

    it("handles vectors of different lengths", () => {
      expect(cosineSimilarity([1, 2], [1, 2, 3])).toBe(0);
    });
  });

  describe("rankItemsByRelevance", () => {
    it("ranks items with highest query term overlap first", () => {
      const query = "smart contract solidity deploy";
      const items = [
        { id: "1", text: "how to cook pasta in kitchen" },
        { id: "2", text: "deploying a solidity smart contract on Base" },
        { id: "3", text: "weather forecast for today" },
      ];

      const ranked = rankItemsByRelevance(query, items, 3);
      expect(ranked[0].item.id).toBe("2");
      expect(ranked[0].score).toBeGreaterThan(0);
    });
  });
});
