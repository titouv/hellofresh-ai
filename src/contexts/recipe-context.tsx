"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { RecipeScraped } from "../../recipe_types";
import { useRecipeSearch, RecipeSearchResult } from "@/hooks/use-recipe-search";

const cookingHistoryStorageKey = "hellofresh-cooking-history";
const cookingHistoryMaxItems = 12;

export interface CookingHistoryItem {
  id: string;
  name: string;
  description: string;
  imagePath: string;
  cookedAt: string;
}

interface RecipeContextType {
  recipe: RecipeScraped | null;
  setRecipe: (recipe: RecipeScraped | null) => void;
  searchRecipes: (query: string) => RecipeSearchResult[];
  recipesLoading: boolean;
  recipesError: string | null;
  recipesReady: boolean;
  cookingHistory: CookingHistoryItem[];
  clearCookingHistory: () => void;
}

const RecipeContext = createContext<RecipeContextType | undefined>(undefined);

export function RecipeProvider({ children }: { children: ReactNode }) {
  const [recipe, setRecipe] = useState<RecipeScraped | null>(null);
  const [cookingHistory, setCookingHistory] = useState<CookingHistoryItem[]>(
    [],
  );
  const {
    searchRecipes,
    loading: recipesLoading,
    error: recipesError,
    ready: recipesReady,
  } = useRecipeSearch();

  useEffect(() => {
    const stored = localStorage.getItem(cookingHistoryStorageKey);
    if (!stored) {
      return;
    }
    try {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        setCookingHistory(parsed);
      }
    } catch (error) {
      console.warn("Failed to load cooking history:", error);
    }
  }, []);

  useEffect(() => {
    if (!recipe) {
      return;
    }
    const newEntry: CookingHistoryItem = {
      id: recipe.id || recipe.recipeId,
      name: recipe.name,
      description: recipe.description,
      imagePath: recipe.imagePath,
      cookedAt: new Date().toISOString(),
    };
    setCookingHistory((prev) => {
      const next = [
        newEntry,
        ...prev.filter((item) => item.id !== newEntry.id),
      ];
      return next.slice(0, cookingHistoryMaxItems);
    });
  }, [recipe]);

  useEffect(() => {
    if (cookingHistory.length === 0) {
      localStorage.removeItem(cookingHistoryStorageKey);
      return;
    }
    try {
      localStorage.setItem(
        cookingHistoryStorageKey,
        JSON.stringify(cookingHistory),
      );
    } catch (error) {
      console.warn("Failed to save cooking history:", error);
    }
  }, [cookingHistory]);

  const clearCookingHistory = () => {
    setCookingHistory([]);
  };

  return (
    <RecipeContext.Provider
      value={{
        recipe,
        setRecipe,
        searchRecipes,
        recipesLoading,
        recipesError,
        recipesReady,
        cookingHistory,
        clearCookingHistory,
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
