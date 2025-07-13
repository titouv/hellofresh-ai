/**
 * Copyright 2024 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import { useEffect, useState, memo } from "react";
import { FunctionDeclaration, LiveServerToolCall, Type } from "@google/genai";
import { useLiveAPIContext } from "@/contexts/live-api-context";
import { useRecipeContext } from "@/contexts/recipe-context";
import { RecipeScraped } from "../../recipe_types";
import { RecipeSearchResult, scrape } from "../../scrape";

const renderStepDeclaration: FunctionDeclaration = {
  name: "render_step",
  description: "Displays the content of the step number n",
  parameters: {
    type: Type.OBJECT,
    properties: {
      step_number: {
        type: Type.NUMBER,
        description: "The step number to display",
      },
    },
    required: ["step_number"],
  },
};

const searchAndSelectRecipeDeclaration: FunctionDeclaration = {
  name: "search_and_select_recipe",
  description:
    "Search for HelloFresh recipes and automatically select the first matching result",
  parameters: {
    type: Type.OBJECT,
    properties: {
      query: {
        type: Type.STRING,
        description:
          "Search query for recipes (e.g., 'pasta', 'chicken', 'vegetarian', 'italien')",
      },
    },
    required: ["query"],
  },
};

export const toolsForConfig = [
  { googleSearch: {} },
  {
    functionDeclarations: [
      renderStepDeclaration,
      searchAndSelectRecipeDeclaration,
    ],
  },
];

function ToolCallComponent() {
  const [shownStep, setShownStep] = useState<
    RecipeScraped["steps"][number] | null
  >(null);
  const { client } = useLiveAPIContext();
  const { recipe, setRecipe } = useRecipeContext();

  const scrapeRecipe = async (url: string): Promise<RecipeScraped> => {
    const urlWithProxy = `/api/proxy-html?url=${encodeURIComponent(url)}`;
    const data = await scrape(urlWithProxy);
    console.log("scrapeRecipe", data);
    return data;
  };

  const searchRecipes = async (
    query: string
  ): Promise<RecipeSearchResult[]> => {
    const response = await fetch(
      `/api/search-recipes?query=${encodeURIComponent(query)}`
    );
    if (!response.ok) {
      throw new Error("Failed to search recipes");
    }
    const data = await response.json();
    console.log("searchRecipes", data);
    return data;
  };

  useEffect(() => {
    const onToolCall = async (toolCall: LiveServerToolCall) => {
      console.log("onToolCall", toolCall, { recipe });
      if (!toolCall.functionCalls) {
        return;
      }

      const functionResponses: Array<{
        response: {
          output: {
            success: boolean;
            message?: string;
            results?: any;
            error?: string;
          };
        };
        id: string;
        name: string;
      }> = [];

      for (const fc of toolCall.functionCalls) {
        console.log("Processing function call:", fc.name, fc.args);

        if (fc.name === renderStepDeclaration.name) {
          console.log("Rendering step", fc.args, { recipe });
          if (recipe) {
            const stepNumber = (fc.args as any).step_number;
            const step = recipe.steps[stepNumber - 1];
            if (step) {
              setShownStep(step);
              functionResponses.push({
                response: {
                  output: {
                    success: true,
                    message: `Step ${stepNumber} displayed`,
                  },
                },
                id: fc.id || "",
                name: fc.name || "",
              });
            } else {
              functionResponses.push({
                response: {
                  output: {
                    success: false,
                    error: `Step ${stepNumber} not found in recipe`,
                  },
                },
                id: fc.id || "",
                name: fc.name || "",
              });
            }
          } else {
            functionResponses.push({
              response: {
                output: {
                  success: false,
                  error:
                    "No recipe selected. Please search and select a recipe first.",
                },
              },
              id: fc.id || "",
              name: fc.name || "",
            });
          }
        } else if (fc.name === searchAndSelectRecipeDeclaration.name) {
          console.log("Searching and selecting recipe", fc.args);
          const query = (fc.args as any).query;
          try {
            const results = await searchRecipes(query);
            if (results.length > 0) {
              const selectedRecipe = results[0]; // Always select the first result
              try {
                const fullRecipe = await scrapeRecipe(selectedRecipe.url);
                console.log("fullRecipe", fullRecipe);
                setRecipe(fullRecipe);
                functionResponses.push({
                  response: {
                    output: {
                      success: true,
                      message: `Recette "${selectedRecipe.name}" trouvée et sélectionnée automatiquement`,
                    },
                  },
                  id: fc.id || "",
                  name: fc.name || "",
                });
              } catch (error) {
                functionResponses.push({
                  response: {
                    output: { success: false, error: "Failed to load recipe" },
                  },
                  id: fc.id || "",
                  name: fc.name || "",
                });
              }
            } else {
              functionResponses.push({
                response: {
                  output: {
                    success: false,
                    error: "Aucune recette trouvée pour cette recherche",
                  },
                },
                id: fc.id || "",
                name: fc.name || "",
              });
            }
          } catch (error) {
            functionResponses.push({
              response: {
                output: { success: false, error: "Failed to search recipes" },
              },
              id: fc.id || "",
              name: fc.name || "",
            });
          }
        }
      }
      console.log("functionResponses", functionResponses);

      if (functionResponses.length > 0) {
        console.log("sending tool response");
        setTimeout(() => client.sendToolResponse({ functionResponses }), 200);
      }
    };

    client.on("toolcall", onToolCall);
    return () => {
      client.off("toolcall", onToolCall);
    };
  }, [client, recipe, setRecipe]);

  const baseImageUrl =
    "https://img.hellofresh.com/w_384,q_auto,f_auto,c_limit,fl_lossy/hellofresh_s3/";

  if (!shownStep) {
    return null;
  }
  
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg">
      <div className="max-w-sm mx-auto p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-16 h-16 rounded-xl overflow-hidden shadow-md flex-shrink-0">
            <img
              src={baseImageUrl + (shownStep?.images?.[0]?.link || "")}
              alt="Recipe step"
              className="w-full h-full object-cover"
            />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-medium text-gray-800 text-sm mb-1">
              Step {(recipe?.steps?.findIndex(s => s === shownStep) || 0) + 1}
            </h4>
            <div 
              className="text-xs text-gray-600 line-clamp-2"
              dangerouslySetInnerHTML={{
                __html: shownStep?.instructionsHTML?.replace(/<[^>]*>/g, '') || "",
              }}
            />
          </div>
        </div>
        <button
          onClick={() => setShownStep(null)}
          className="w-full text-xs text-gray-500 hover:text-gray-700 py-1"
        >
          Close
        </button>
      </div>
    </div>
  );
}

export const ToolCall = memo(ToolCallComponent);
