"use client";

import { createContext, useContext, useState, ReactNode } from "react";
import { RecipeScraped } from "../../recipe_types";

interface RecipeContextType {
  recipe: RecipeScraped | null;
  setRecipe: (recipe: RecipeScraped | null) => void;
}

const RecipeContext = createContext<RecipeContextType | undefined>(undefined);

export function RecipeProvider({ children }: { children: ReactNode }) {
  const [recipe, setRecipe] = useState<RecipeScraped | null>(null);

  return (
    <RecipeContext.Provider value={{ recipe, setRecipe }}>
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