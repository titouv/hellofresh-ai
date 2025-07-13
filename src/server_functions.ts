"use server";

import { scrapeRecipe, searchRecipes } from "../scrape";

export const searchRecipesServerFn = async (query: string) => {
  return searchRecipes(query);
};

export const scrapeRecipeServerFn = async (url: string) => {
  return scrapeRecipe(url);
};
