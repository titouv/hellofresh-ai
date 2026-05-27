import { useEffect, useMemo, useState, memo } from "react";
import { tool } from "@openai/agents/realtime";
import { z } from "zod";
import { useLiveAPIContext } from "@/contexts/live-api-context";
import { useRecipeContext } from "@/contexts/recipe-context";
import { useTimerContext } from "@/contexts/timer-context";
import { RecipeSearchResult } from "@/hooks/use-recipe-search";
import { RecipeScraped } from "../../recipe_types";
import {
  scrapeRecipeServerFn,
  searchRecipesLiveServerFn,
} from "@/server_functions";
import { fullRecipeToMarkdown } from "@/app/debug/utils";

function ToolCallComponent() {
  const [shownStep, setShownStep] = useState<
    RecipeScraped["steps"][number] | null
  >(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("");
  const [isStepImageFullscreen, setIsStepImageFullscreen] = useState(false);
  const { client, setTools } = useLiveAPIContext();
  const { recipe, setRecipe, servingSize, searchRecipes, recipesReady } =
    useRecipeContext();
  const { startTimer } = useTimerContext();

  useEffect(() => {
    if (!shownStep) {
      setIsStepImageFullscreen(false);
    }
  }, [shownStep]);

  const liveTools = useMemo(
    () => [
      tool({
        name: "render_step",
        description: "Displays the content of the step number n",
        parameters: z.object({
          step_number: z
            .number()
            .describe("The step number to display"),
        }),
        execute: async ({ step_number }) => {
          console.log("Rendering step", { step_number, recipe });
          if (!recipe) {
            return {
              success: false,
              error:
                "No recipe selected. Please search and select a recipe first.",
            };
          }

          const step = recipe.steps[step_number - 1];
          if (!step) {
            return {
              success: false,
              error: `Step ${step_number} not found in recipe`,
            };
          }

          setShownStep(step);
          return {
            success: true,
            message: `Step ${step_number} displayed`,
          };
        },
      }),
      tool({
        name: "search_and_select_recipe",
        description:
          "Search for HelloFresh recipes and automatically select the first matching result",
        parameters: z.object({
          query: z
            .string()
            .describe(
              "Search query for recipes (e.g., 'pasta', 'chicken', 'vegetarian', 'italien')",
            ),
        }),
        execute: async ({ query }) => {
          console.log("Searching and selecting recipe", { query });
          setIsLoading(true);
          setLoadingMessage(`Searching for "${query}"...`);

          try {
            let results: RecipeSearchResult[] = [];

            try {
              console.log(`🔵 [frontend] live search start: "${query}"`);
              setLoadingMessage(`Searching live for "${query}"...`);
              const liveResults = await searchRecipesLiveServerFn(query);
              if (liveResults.length > 0) {
                console.log(
                  `🟢 [frontend] live search hit (${liveResults.length} results)`,
                );
                results = liveResults;
              } else {
                console.log("🟡 [frontend] live search returned 0 results");
              }
            } catch (error) {
              console.warn(
                "🟠 [frontend] live search failed, falling back to cache.",
                error,
              );
            }

            if (results.length === 0 && recipesReady) {
              console.log(`🔵 [frontend] cached search start: "${query}"`);
              setLoadingMessage(`Searching cached recipes for "${query}"...`);
              results = searchRecipes(query);
              if (results.length > 0) {
                console.log(
                  `🟢 [frontend] cached search hit (${results.length} results)`,
                );
              } else {
                console.log("🟡 [frontend] cached search returned 0 results");
              }
            }

            if (results.length === 0) {
              return {
                success: false,
                error: recipesReady
                  ? "Aucune recette trouvée pour cette recherche"
                  : "Recipe database is still loading. Please try again in a moment.",
              };
            }

            const selectedRecipe = results[0];
            setLoadingMessage(`Loading recipe "${selectedRecipe.name}"...`);

            const fullRecipe = await scrapeRecipeServerFn(selectedRecipe.url);
            console.log("fullRecipe", fullRecipe);
            setRecipe(fullRecipe);

            const message = `Recette "${
              selectedRecipe.name
            }" trouvée et sélectionnée automatiquement

                        Voici la recette:
                        ${fullRecipeToMarkdown(
                          fullRecipe,
                          servingSize ?? undefined,
                        )}

                        `;

            console.log("MESSAGE RETURNED TO USER", message);

            return {
              success: true,
              message,
            };
          } catch (error) {
            console.warn("Failed to search recipes", error);
            return {
              success: false,
              error: "Failed to search recipes",
            };
          } finally {
            setIsLoading(false);
            setLoadingMessage("");
          }
        },
      }),
      tool({
        name: "start_timer",
        description: "Start a timer for a specified duration in seconds",
        parameters: z.object({
          seconds: z
            .number()
            .describe("Duration of the timer in seconds"),
        }),
        execute: async ({ seconds }) => {
          console.log("Starting timer", { seconds });
          const timerId = startTimer(seconds, () => {
            client.send({
              text: `RETOUR SYSTEME: Le timer s'est terminé, tu dois prévenir l'utilisateur que le timer s'est terminé`,
            });
          });
          return {
            success: true,
            message: `Timer started for ${seconds} seconds (Timer ID: ${timerId})`,
          };
        },
      }),
      tool({
        name: "show_step_image_fullscreen",
        description: "Show the current step image in fullscreen",
        parameters: z.object({}),
        execute: async () => {
          if (!shownStep) {
            return {
              success: false,
              error: "No step image available to show fullscreen",
            };
          }

          setIsStepImageFullscreen(true);
          return {
            success: true,
            message: "Step image shown fullscreen",
          };
        },
      }),
      tool({
        name: "hide_step_image_fullscreen",
        description: "Hide the fullscreen step image",
        parameters: z.object({}),
        execute: async () => {
          setIsStepImageFullscreen(false);
          return {
            success: true,
            message: "Fullscreen step image hidden",
          };
        },
      }),
    ],
    [
      client,
      recipe,
      recipesReady,
      searchRecipes,
      servingSize,
      setRecipe,
      shownStep,
      startTimer,
    ],
  );

  useEffect(() => {
    setTools(liveTools);
  }, [liveTools, setTools]);

  useEffect(() => {
    const onToolCall = async () => {
      // Play sound when action starts
      try {
        const audio = new Audio(
          "https://assets.mixkit.co/active_storage/sfx/2867/2867-preview.mp3",
        );
        audio.volume = 0.3;
        audio.play().catch(() => {
          // Ignore audio play errors (e.g., user hasn't interacted yet)
        });
      } catch (error) {
        // Ignore any audio errors
      }
    };

    client.on("toolcall", onToolCall);
    return () => {
      client.off("toolcall", onToolCall);
    };
  }, [client]);

  const baseImageUrl =
    "https://img.hellofresh.com/w_384,q_auto,f_auto,c_limit,fl_lossy/hellofresh_s3/";

  // Show loading state
  if (isLoading) {
    return (
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg">
        <div className="max-w-sm mx-auto p-4">
          <div className="flex items-center justify-center gap-3">
            <svg
              className="animate-spin h-6 w-6 text-green-600"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              ></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
            <span className="text-sm text-gray-600">{loadingMessage}</span>
          </div>
        </div>
      </div>
    );
  }

  // Show recipe image when recipe is selected but no specific step is shown
  if (!shownStep && recipe) {
    return (
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg">
        <div className="max-w-sm mx-auto p-4">
          <div className="flex flex-col items-center gap-3 mb-3">
            <div className="w-full h-48 rounded-xl overflow-hidden shadow-md mb-2">
              <img
                src={baseImageUrl + recipe.imagePath}
                alt={recipe.name}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="w-full">
              <h4 className="font-medium text-gray-800 text-sm mb-1">
                {recipe.name}
              </h4>
              <p className="text-xs text-gray-600 mb-2">{recipe.description}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!shownStep) {
    return null;
  }

  const stepImageUrl =
    baseImageUrl + (shownStep?.images?.[0]?.link || "");

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg">
      {isStepImageFullscreen && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center">
          <button
            onClick={() => setIsStepImageFullscreen(false)}
            className="absolute top-4 right-4 text-white text-sm bg-black/50 px-3 py-1 rounded"
          >
            Close
          </button>
          <img
            src={stepImageUrl}
            alt="Recipe step fullscreen"
            className="max-h-[90vh] max-w-[92vw] object-contain"
          />
        </div>
      )}
      <div className="max-w-sm mx-auto p-4">
        <div className="flex flex-col items-center gap-3 mb-3">
          <div
            className="w-full h-32 rounded-xl overflow-hidden shadow-md mb-2 cursor-zoom-in"
            onClick={() => setIsStepImageFullscreen(true)}
          >
            <img
              src={stepImageUrl}
              alt="Recipe step"
              className="w-full h-full object-cover"
            />
          </div>
          <button
            onClick={() => setIsStepImageFullscreen(true)}
            className="text-xs text-blue-600 hover:text-blue-700"
          >
            View full screen
          </button>
          <div className="w-full">
            <h4 className="font-medium text-gray-800 text-sm mb-1">
              Step {(recipe?.steps?.findIndex((s) => s === shownStep) || 0) + 1}
            </h4>
            <div
              className="text-xs text-gray-600 prose"
              dangerouslySetInnerHTML={{
                __html: shownStep?.instructionsHTML,
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
