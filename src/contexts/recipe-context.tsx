"use client";

import { createContext, useContext, useState, ReactNode } from "react";
import { RecipeScraped } from "../../recipe_types";
import { useRecipeSearch, RecipeSearchResult } from "@/hooks/use-recipe-search";

interface RecipeContextType {
  recipe: RecipeScraped | null;
  setRecipe: (recipe: RecipeScraped | null) => void;
  searchRecipes: (query: string) => RecipeSearchResult[];
  recipesLoading: boolean;
  recipesError: string | null;
  recipesReady: boolean;
}

const RecipeContext = createContext<RecipeContextType | undefined>(undefined);

export function RecipeProvider({ children }: { children: ReactNode }) {
  const [recipe, setRecipe] = useState<RecipeScraped | null>(null);
  const {
    searchRecipes,
    loading: recipesLoading,
    error: recipesError,
    ready: recipesReady,
  } = useRecipeSearch();

  return (
    <RecipeContext.Provider
      value={{
        recipe,
        setRecipe,
        searchRecipes,
        recipesLoading,
        recipesError,
        recipesReady,
      }}
    >
      {children}
    </RecipeContext.Provider>
  );
}

export const useRecipeContext = () => {
  const context = useContext(RecipeContext);
  if (!context) {
    throw new Error("useRecipeContext must be used within a RecipeProvider");
  }
  return context;
};
