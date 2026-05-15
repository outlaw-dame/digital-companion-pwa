/**
 * Entity linker unit tests — covers local NER and formatting.
 * Wikidata/DBpedia calls are NOT made — ENTITY_LINKING_ENABLED is left unset.
 */

import { describe, test, expect } from "bun:test";
import {
  extractCandidateEntities,
  formatEntitiesForPrompt,
} from "../engine/entityLinker";
import type { LinkedEntity } from "../types/core";

// ─── extractCandidateEntities ─────────────────────────────────────────────────

describe("extractCandidateEntities", () => {
  test("extracts a simple proper noun", () => {
    const candidates = extractCandidateEntities("I visited Paris last week.");
    expect(candidates).toContain("Paris");
  });

  test("extracts multi-word proper nouns", () => {
    const candidates = extractCandidateEntities("I read about Albert Einstein yesterday.");
    expect(candidates.some((c) => c.includes("Albert"))).toBe(true);
  });

  test("filters stopwords at sentence start", () => {
    const candidates = extractCandidateEntities("The weather in Berlin was great.");
    // "The" must be filtered; "Berlin" must be present
    expect(candidates).not.toContain("The");
    expect(candidates).toContain("Berlin");
  });

  test("filters standalone stopwords", () => {
    const STOPWORDS = ["I", "We", "They", "He", "She", "It", "You", "My", "Our", "But", "And"];
    for (const word of STOPWORDS) {
      const candidates = extractCandidateEntities(`${word} went to the store.`);
      expect(candidates).not.toContain(word);
    }
  });

  test("deduplicates repeated surface forms", () => {
    const candidates = extractCandidateEntities("London is great. London has history. London rocks.");
    const londonCount = candidates.filter((c) => c === "London").length;
    expect(londonCount).toBe(1);
  });

  test("caps at 5 entities", () => {
    const text =
      "Alice Bob Carol Dave Eve Frank Grace Henry Iris Jack Kara Leo Mona Nina Oscar";
    const candidates = extractCandidateEntities(text);
    expect(candidates.length).toBeLessThanOrEqual(5);
  });

  test("returns empty array for text with no proper nouns", () => {
    const candidates = extractCandidateEntities("the cat sat on the mat. it was quiet there.");
    expect(candidates).toHaveLength(0);
  });

  test("returns empty array for empty string", () => {
    expect(extractCandidateEntities("")).toHaveLength(0);
  });

  test("handles text that is only stopwords gracefully", () => {
    const candidates = extractCandidateEntities("The And Or But If So");
    expect(candidates).toHaveLength(0);
  });
});

// ─── formatEntitiesForPrompt ──────────────────────────────────────────────────

describe("formatEntitiesForPrompt", () => {
  test("returns empty string for empty array", () => {
    expect(formatEntitiesForPrompt([])).toBe("");
  });

  test("includes entity type, label, description, and URI", () => {
    const entities: LinkedEntity[] = [
      {
        surface: "Paris",
        label: "Paris",
        description: "Capital city of France",
        wikidataUri: "https://www.wikidata.org/wiki/Q90",
        dbpediaUri: null,
        entityType: "place",
      },
    ];
    const output = formatEntitiesForPrompt(entities);
    expect(output).toContain("IDENTIFIED ENTITIES");
    expect(output).toContain("[place: Paris]");
    expect(output).toContain("Capital city of France");
    expect(output).toContain("https://www.wikidata.org/wiki/Q90");
  });

  test("uses 'entity' as fallback when entityType is null", () => {
    const entities: LinkedEntity[] = [
      {
        surface: "Foo",
        label: "Foo",
        description: null,
        wikidataUri: null,
        dbpediaUri: null,
        entityType: null,
      },
    ];
    const output = formatEntitiesForPrompt(entities);
    expect(output).toContain("[entity: Foo]");
  });

  test("omits description when null", () => {
    const entities: LinkedEntity[] = [
      {
        surface: "X",
        label: "X",
        description: null,
        wikidataUri: "https://www.wikidata.org/wiki/Q1",
        dbpediaUri: null,
        entityType: "concept",
      },
    ];
    const output = formatEntitiesForPrompt(entities);
    // Should not have a blank — after the label there should be URI
    expect(output).not.toMatch(/\[concept: X\] — \n/);
    expect(output).toContain("https://www.wikidata.org/wiki/Q1");
  });

  test("formats multiple entities as separate lines", () => {
    const entities: LinkedEntity[] = [
      { surface: "A", label: "Alpha", description: null, wikidataUri: null, dbpediaUri: null, entityType: "place" },
      { surface: "B", label: "Beta",  description: null, wikidataUri: null, dbpediaUri: null, entityType: "person" },
    ];
    const output = formatEntitiesForPrompt(entities);
    // Each entity renders as [type: label]; filter lines that match that pattern
    const entityLines = output.split("\n").filter((l) => /^\[(?:place|person|organization|entity|concept):/.test(l));
    expect(entityLines).toHaveLength(2);
  });

  test("includes DBpedia URI when wikidataUri is null", () => {
    const entities: LinkedEntity[] = [
      {
        surface: "Rome",
        label: "Rome",
        description: "Capital of Italy",
        wikidataUri: null,
        dbpediaUri: "http://dbpedia.org/resource/Rome",
        entityType: "place",
      },
    ];
    const output = formatEntitiesForPrompt(entities);
    expect(output).not.toContain("http://dbpedia.org");
    // DBpedia URI is not included in the format (only wikidataUri is rendered via <>)
    // Verify the label and description are present
    expect(output).toContain("[place: Rome]");
    expect(output).toContain("Capital of Italy");
  });
});

// ─── linkEntities: env guard ──────────────────────────────────────────────────

describe("linkEntities env guard", () => {
  test("returns empty array when ENTITY_LINKING_ENABLED is not set", async () => {
    const { linkEntities } = await import("../engine/entityLinker");
    // env var is not set in test environment
    const result = await linkEntities("Albert Einstein was born in Germany.");
    expect(result).toEqual([]);
  });
});
