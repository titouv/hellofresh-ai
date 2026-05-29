"use server";

import { scrapeRecipe } from "../scrape";
import { apiClient } from "@/lib/api/client";
import type { RecipeSearchResult } from "@/lib/api/types";

export const scrapeRecipeServerFn = async (url: string) => {
  return scrapeRecipe(url);
};

function slugFromUrl(url: string): string {
  const parts = url.split("/");
  const last = parts[parts.length - 1];
  if (!last) return "";
  const slug = last.includes("-") ? last.split("-").slice(0, -1).join("-") : "";
  return slug;
}

function mapApiRecipeToSearchResult(recipe: {
  id?: number;
  name?: string;
  url?: string;
  headline?: string | null;
  card_image_url?: string | null;
  pdf_url?: string | null;
  label?: { name?: string } | null;
  tags?: { name?: string }[] | null;
}): RecipeSearchResult {
  return {
    id: String(recipe.id ?? ""),
    name: recipe.name ?? "",
    slug: slugFromUrl(recipe.url ?? ""),
    headline: recipe.headline ?? "",
    image: recipe.card_image_url ?? "",
    pdf: recipe.pdf_url ?? "",
    label: recipe.label?.name ?? "",
    tags: recipe.tags?.map((t) => t.name ?? "").filter(Boolean) ?? [],
    url: recipe.url ?? "",
  };
}

export const searchRecipesServerFn = async (query: string) => {
  if (!query.trim()) return [];

  const { data, error } = await apiClient.GET(
    "/{locale}-{country}/recipes",
    {
      params: {
        path: { locale: "fr", country: "FR" },
        query: { search: query.trim(), per_page: 20 },
      },
    },
  );

  if (error || !data?.data) {
    console.error("API search error:", error);
    return [];
  }

  return data.data
    .filter((r) => r != null)
    .map(mapApiRecipeToSearchResult);
};

export const searchRecipesLiveServerFn = searchRecipesServerFn;
