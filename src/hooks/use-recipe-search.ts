"use client";

import { useState, useEffect, useMemo } from "react";
import Fuse from "fuse.js";

export interface RecipeFromSearch {
  id: string;
  name: string;
  slug: string;
  pdf: string | null;
  headline: string;
  image: string;
  imagePath?: string;
  description?: string;
  seoDescription?: string;
  ingredients?: Array<{ name: string; [key: string]: any }>;
  cuisines?: Array<{ name: string; [key: string]: any }>;
  difficulty?: string | number;
  prepTime?: string;
  totalTime?: string;
  recipeId?: string;
  websiteUrl?: string;
  canonicalLink?: string;
  label?:
    | {
        text: string;
        color: string;
        bg: string;
      }
    | string;
  tags: string[] | Array<{ name: string; [key: string]: any }>;
  url: string;
}

export interface RecipeSearchResult {
  id: string;
  name: string;
  slug: string;
  pdf: string;
  headline: string;
  image: string;
  label: string;
  tags: string[];
  url: string;
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

async function loadAllRecipes(): Promise<RecipeFromSearch[]> {
  try {
    // Try to load from localStorage first
    const cached = localStorage.getItem("hellofresh-recipes");
    if (cached) {
      const cachedData = JSON.parse(cached);
      // Check if cache is less than 24 hours old
      if (Date.now() - cachedData.timestamp < 24 * 60 * 60 * 1000) {
        return cachedData.recipes;
      }
    }
  } catch (err) {
    // Cache read failed, continue to fetch
  }

  // Fetch from remote URL
  const url =
    "https://pub-c153d3d3306a4942aab1c0e687a18614.r2.dev/recipes.json";
  const response = await fetch(url);
  const data = await response.json();

  try {
    // Cache the data in localStorage
    localStorage.setItem(
      "hellofresh-recipes",
      JSON.stringify({
        recipes: data,
        timestamp: Date.now(),
      }),
    );
  } catch (err) {
    // Failed to write cache, but we can still return the data
    console.warn("Failed to cache recipes:", err);
  }

  return data;
}

export function useRecipeSearch() {
  const [recipes, setRecipes] = useState<RecipeFromSearch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load recipes on mount
  useEffect(() => {
    let mounted = true;

    const loadRecipes = async () => {
      try {
        const data = await loadAllRecipes();
        if (mounted) {
          setRecipes(data);
          setError(null);
        }
      } catch (err) {
        if (mounted) {
          setError(
            err instanceof Error ? err.message : "Failed to load recipes",
          );
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadRecipes();

    return () => {
      mounted = false;
    };
  }, []);

  // Create Fuse instance with recipes
  const fuse = useMemo(() => {
    if (recipes.length === 0) return null;

    // Prepare recipes for Fuse.js with normalized text
    const recipesForSearch = recipes.map((recipe) => ({
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

    // Configure Fuse.js options
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
        {
          name: "searchText",
          weight: 0.1,
        },
      ],
      includeScore: true,
      includeMatches: true,
      threshold: 0.5,
      minMatchCharLength: 2,
      findAllMatches: true,
      useExtendedSearch: false,
      ignoreLocation: true,
      distance: 100,
    };

    return new Fuse(recipesForSearch, fuseOptions);
  }, [recipes]);

  // Search function
  const searchRecipes = useMemo(() => {
    return (query: string): RecipeSearchResult[] => {
      if (!fuse || !query.trim()) return [];

      console.log(`Fuzzy searching for query: "${query}"`);

      // Normalize the query
      const normalizedQuery = normalizeText(query);

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
  }, [fuse]);

  return {
    recipes,
    loading,
    error,
    searchRecipes,
    ready: !loading && !error && recipes.length > 0,
  };
}
