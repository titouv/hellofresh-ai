"use server";

import { RecipeSearchResult, scrapeRecipe, searchRecipes } from "../scrape";
import Fuse from "fuse.js";

import path from "path";
import fs from "fs";

const RECIPES_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const LIVE_SEARCH_TTL_MS = 10 * 60 * 1000;

type LiveSearchCacheEntry = {
  timestamp: number;
  results: RecipeSearchResult[];
};

const liveSearchCache: Map<string, LiveSearchCacheEntry> =
  (globalThis as any).__liveSearchCache ?? new Map();
(globalThis as any).__liveSearchCache = liveSearchCache;

function extractQueryFromMaybeUrl(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  try {
    const parsed = new URL(trimmed);
    const searchParam = parsed.searchParams.get("search");
    if (searchParam) return searchParam.trim();
  } catch {
    // Not a URL, continue with raw text
  }
  return trimmed;
}

function deaccentAndNormalize(text: string): string {
  return text
    .replace(/œ/g, "oe")
    .replace(/Œ/g, "OE")
    .replace(/æ/g, "ae")
    .replace(/Æ/g, "AE")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function generateQueryVariants(input: string): string[] {
  const cleaned = input.trim().replace(/\s+/g, " ");
  const variants = new Set<string>();
  if (!cleaned) return [];

  variants.add(cleaned);
  variants.add(deaccentAndNormalize(cleaned));

  const tokens = cleaned.split(" ");
  tokens.forEach((token, index) => {
    const lower = token.toLowerCase();
    if (lower.length <= 4) return;

    if (lower.endsWith("s") && !lower.endsWith("ss")) {
      const singular = token.slice(0, -1);
      const next = [...tokens];
      next[index] = singular;
      variants.add(next.join(" "));
    } else if (!lower.endsWith("s")) {
      const plural = `${token}s`;
      const next = [...tokens];
      next[index] = plural;
      variants.add(next.join(" "));
    }
  });

  Array.from(variants).forEach((variant) => {
    variants.add(deaccentAndNormalize(variant));
  });

  return Array.from(variants).slice(0, 12);
}

interface RecipeFromSearch {
  id: string;
  name: string;
  slug: string;
  pdf: string | null;
  headline: string;
  image: string;
  label: {
    text: string;
    color: string;
    bg: string;
  };
  tags: string[];
  url: string;
}
async function loadAllRecipes(): Promise<RecipeFromSearch[]> {
  const cachePath = path.join(process.cwd(), "./.cache/recipes.json");
  let staleData: RecipeFromSearch[] | null = null;
  try {
    const stats = fs.statSync(cachePath);
    const ageMs = Date.now() - stats.mtimeMs;
    const localFile = fs.readFileSync(cachePath, "utf8");
    if (localFile) {
      const parsed = JSON.parse(localFile);
      if (Array.isArray(parsed)) {
        staleData = parsed;
        if (ageMs < RECIPES_CACHE_TTL_MS) {
          console.log(
            `🟢 recipes cache hit (server file, age ${Math.round(
              ageMs / 1000,
            )}s)`,
          );
          return staleData;
        }
      }
    }
  } catch (err) {
    // File doesn't exist or can't be read, continue to fetch
  }

  const url =
    "https://pub-c153d3d3306a4942aab1c0e687a18614.r2.dev/recipes.json";
  let data;
  try {
    console.log("🔵 recipes cache miss, fetching remote dataset");
    const response = await fetch(url);
    data = await response.json();
  } catch (err) {
    if (staleData) {
      console.warn("🟡 remote fetch failed, using stale server cache", err);
      return staleData;
    }
    console.error("🔴 remote fetch failed and no server cache available", err);
    throw err;
  }

  try {
    // Ensure .cache directory exists
    const cacheDir = path.join(process.cwd(), ".cache");
    if (!fs.existsSync(cacheDir)) {
      fs.mkdirSync(cacheDir, { recursive: true });
    }

    fs.writeFileSync(cachePath, JSON.stringify(data, null, 2));
  } catch (err) {
    // Failed to write cache file, but we can still return the data
    console.warn("Failed to write recipes cache file:", err);
  }

  return data;
}

// Simple French word normalization (focus on food-related words)
function normalizeFrenchWord(word: string): string {
  const lower = word.toLowerCase();

  // Common food words that have plural forms we want to normalize
  const foodPlurals: Record<string, string> = {
    tomates: "tomate",
    pommes: "pomme",
    carottes: "carotte",
    poivrons: "poivron",
    oignons: "oignon",
    champignons: "champignon",
    courgettes: "courgette",
    aubergines: "aubergine",
    haricots: "haricot",
    "petits pois": "petit pois",
    épinards: "épinard",
    brocolis: "brocoli",
    choux: "chou",
    salades: "salade",
    endives: "endive",
    radis: "radis",
    navets: "navet",
    betteraves: "betterave",
    céleris: "céleri",
    asperges: "asperge",
    artichauts: "artichaut",
    poireaux: "poireau",
    échalotes: "échalote",
    ail: "ail",
    persil: "persil",
    thym: "thym",
    romarin: "romarin",
    basilic: "basilic",
    origan: "origan",
    laurier: "laurier",
  };

  // Check if this is a known food plural
  if (foodPlurals[lower]) {
    return foodPlurals[lower];
  }

  // For other words, only remove 's' if it's clearly a plural (word ends with consonant + s)
  if (lower.endsWith("s") && lower.length > 4) {
    const withoutS = lower.slice(0, -1);
    // Only remove 's' if the word without 's' doesn't end with 's' (avoiding double 's' words)
    if (!withoutS.endsWith("s")) {
      return withoutS;
    }
  }

  return lower;
}

// Normalize text for better matching
function normalizeText(text: string): string {
  if (!text) return "";

  return text
    .toLowerCase()
    .split(/\s+/)
    .map((word) => normalizeFrenchWord(word))
    .join(" ");
}

// Helper function to get recipe text for searching
function getRecipeSearchText(recipe: any): string {
  const searchableFields = [
    recipe.name || "",
    recipe.headline || "",
    recipe.description || "",
    recipe.seoDescription || "",
    ...(recipe.ingredients?.map((ing: any) => ing.name) || []),
    ...(recipe.tags?.map((tag: any) => tag.name || tag) || []),
    ...(recipe.cuisines?.map((cuisine: any) => cuisine.name) || []),
    recipe.difficulty?.toString() || "",
    recipe.prepTime || "",
    recipe.totalTime || "",
  ];

  return searchableFields.join(" ").toLowerCase();
}

export const searchRecipesServerFn = async (query: string) => {
  console.log(`Fuzzy searching for query: "${query}"`);

  // Normalize the query
  const normalizedQuery = normalizeText(query);

  const allRecipes = await loadAllRecipes();

  // Prepare recipes for Fuse.js with normalized text
  const recipesForSearch = (allRecipes as any[]).map((recipe) => ({
    ...recipe,
    searchText: getRecipeSearchText(recipe),
    normalizedName: normalizeText(recipe.name || ""),
    normalizedHeadline: normalizeText(recipe.headline || ""),
    normalizedDescription: normalizeText(recipe.description || ""),
    normalizedIngredients: (recipe.ingredients || [])
      .map((ing: any) => normalizeText(ing.name || ""))
      .join(" "),
    normalizedTags: (recipe.tags || [])
      .map((tag: any) =>
        normalizeText(typeof tag === "string" ? tag : tag.name || ""),
      )
      .join(" "),
    // Convert to RecipeSearchResult format
    searchResult: {
      id: recipe.id || recipe.recipeId,
      name: recipe.name,
      slug: recipe.slug,
      pdf: recipe.pdf || "",
      headline: recipe.headline || "",
      image: recipe.image || recipe.imagePath || "",
      label: recipe.label || "",
      tags: Array.isArray(recipe.tags)
        ? recipe.tags
            .map((tag: any) => (typeof tag === "string" ? tag : tag.name))
            .filter(Boolean)
        : [],
      url: recipe.url || recipe.websiteUrl || recipe.canonicalLink || "",
    },
  }));

  // Configure Fuse.js options with custom getFn for better matching
  const fuseOptions = {
    keys: [
      {
        name: "name",
        weight: 0.4,
        getFn: (obj: any) => obj.name,
      },
      {
        name: "headline",
        weight: 0.3,
        getFn: (obj: any) => obj.headline,
      },
      // {
      //   name: "description",
      //   weight: 0.2,
      //   getFn: (obj: any) => [obj.description, obj.normalizedDescription],
      // },
      // {
      //   name: "ingredients",
      //   weight: 0.2,
      //   getFn: (obj: any) => [
      //     obj.ingredients?.map((ing: any) => ing.name).join(" "),
      //     obj.normalizedIngredients,
      //   ],
      // },
      // {
      //   name: "tags",
      //   weight: 0.15,
      //   getFn: (obj: any) => [
      //     obj.tags
      //       ?.map((tag: any) => (typeof tag === "string" ? tag : tag.name))
      //       .join(" "),
      //     obj.normalizedTags,
      //   ],
      // },
      {
        name: "searchText",
        weight: 0.1,
      },
    ],
    includeScore: true,
    includeMatches: true,
    threshold: 0.5, // Slightly higher threshold for more flexible matching
    minMatchCharLength: 2,
    findAllMatches: true,
    useExtendedSearch: false,
    ignoreLocation: true,
    distance: 100,
  };

  const fuse = new Fuse(recipesForSearch, fuseOptions);

  // Perform fuzzy search with the original query
  const searchResults = fuse.search(query);

  // Also search with normalized query but with lower weight
  const normalizedSearchResults = fuse.search(normalizedQuery);

  // Combine results with better deduplication
  const allResults = [...searchResults, ...normalizedSearchResults];
  const uniqueResults = new Map();

  allResults.forEach((result) => {
    const key = result.item.id || result.item.recipeId;
    const existing = uniqueResults.get(key);

    if (!existing || (result.score || 1) < (existing.score || 1)) {
      uniqueResults.set(key, result);
    }
  });

  const finalResults = Array.from(uniqueResults.values()).sort(
    (a, b) => (a.score || 1) - (b.score || 1),
  );

  console.log(`Found ${finalResults.length} fuzzy matches`);

  // Log top results for debugging
  const topResults = finalResults.slice(0, 5);
  console.table(
    topResults.map(({ item, score, matches }) => ({
      name: item.name,
      score: score ? (1 - score).toFixed(3) : "1.000",
      matches:
        matches
          ?.slice(0, 2)
          .map((m: any) => `${m.key}: ${m.value}`)
          .join(", ") || "N/A",
    })),
  );

  // Return results sorted by score (best matches first)
  return finalResults
    .filter((result) => result.score !== undefined && result.score < 0.8) // Filter out poor matches
    .map((result) => result.item.searchResult);
};

export const scrapeRecipeServerFn = async (url: string) => {
  return scrapeRecipe(url);
};

export const searchRecipesLiveServerFn = async (query: string) => {
  const trimmedQuery = extractQueryFromMaybeUrl(query);
  if (!trimmedQuery) return [];

  const cacheKey = normalizeText(trimmedQuery);
  // const cached = liveSearchCache.get(cacheKey);
  // if (cached && Date.now() - cached.timestamp < LIVE_SEARCH_TTL_MS) {
  //   console.log(
  //     `🟢 live search cache hit (server memory, query "${trimmedQuery}")`,
  //   );
  //   return cached.results;
  // }

  const variants = generateQueryVariants(trimmedQuery);
  console.log(
    `🔵 live search fetch (query "${trimmedQuery}", ${variants.length} variants)`,
  );

  let results: RecipeSearchResult[] = [];
  for (const variant of variants) {
    console.log(`🔍 live search try: "${variant}"`);
    results = await searchRecipes(variant);
    if (results.length > 0) {
      console.log(
        `🟢 live search match (${results.length} results) on "${variant}"`,
      );
      break;
    }
  }

  liveSearchCache.set(cacheKey, { timestamp: Date.now(), results });
  return results;
};
