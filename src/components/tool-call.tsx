import { useEffect, useState, memo } from "react";
import {
  Behavior,
  FunctionDeclaration,
  LiveServerToolCall,
  Type,
} from "@google/genai";
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
  behavior: Behavior.NON_BLOCKING,
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

const startTimerDeclaration: FunctionDeclaration = {
  name: "start_timer",
  description: "Start a timer for a specified duration in seconds",
  parameters: {
    type: Type.OBJECT,
    properties: {
      seconds: {
        type: Type.NUMBER,
        description: "Duration of the timer in seconds",
      },
    },
    required: ["seconds"],
  },
};

const showStepImageFullscreenDeclaration: FunctionDeclaration = {
  name: "show_step_image_fullscreen",
  description: "Show the current step image in fullscreen",
  parameters: {
    type: Type.OBJECT,
    properties: {},
  },
};

const hideStepImageFullscreenDeclaration: FunctionDeclaration = {
  name: "hide_step_image_fullscreen",
  description: "Hide the fullscreen step image",
  parameters: {
    type: Type.OBJECT,
    properties: {},
  },
};

export const toolsForConfig = [
  { googleSearch: {} },
  {
    functionDeclarations: [
      renderStepDeclaration,
      searchAndSelectRecipeDeclaration,
      startTimerDeclaration,
      showStepImageFullscreenDeclaration,
      hideStepImageFullscreenDeclaration,
    ],
  },
];

function ToolCallComponent() {
  const [shownStep, setShownStep] = useState<
    RecipeScraped["steps"][number] | null
  >(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("");
  const [isStepImageFullscreen, setIsStepImageFullscreen] = useState(false);
  const { client } = useLiveAPIContext();
  const { recipe, setRecipe, servingSize, searchRecipes, recipesReady } =
    useRecipeContext();
  const { startTimer } = useTimerContext();

  useEffect(() => {
    if (!shownStep) {
      setIsStepImageFullscreen(false);
    }
  }, [shownStep]);

  useEffect(() => {
    const onToolCall = async (toolCall: LiveServerToolCall) => {
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

            if (results.length > 0) {
              const selectedRecipe = results[0]; // Always select the first result
              setLoadingMessage(`Loading recipe "${selectedRecipe.name}"...`);

              try {
                const fullRecipe = await scrapeRecipeServerFn(
                  selectedRecipe.url,
                );
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

                functionResponses.push({
                  response: {
                    output: {
                      success: true,
                      message: message,
                    },
                  },
                  id: fc.id || "",
                  name: fc.name || "",
                });
              } catch (error) {
                functionResponses.push({
                  response: {
                    output: {
                      success: false,
                      error: "Failed to load recipe",
                    },
                  },
                  id: fc.id || "",
                  name: fc.name || "",
                });
              }
            } else if (!recipesReady) {
              functionResponses.push({
                response: {
                  output: {
                    success: false,
                    error:
                      "Recipe database is still loading. Please try again in a moment.",
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
          } finally {
            setIsLoading(false);
            setLoadingMessage("");
          }
        } else if (fc.name === startTimerDeclaration.name) {
          console.log("Starting timer", fc.args);
          const seconds = (fc.args as any).seconds;
          const timerId = startTimer(seconds, () => {
            // Send message to AI when timer finishes
            client.send({
              text: `RETOUR SYSTEME: Le timer s'est terminé, tu doois prévenir l'utilisateur que le timer s'est terminé`,
            });
          });
          functionResponses.push({
            response: {
              output: {
                success: true,
                message: `Timer started for ${seconds} seconds (Timer ID: ${timerId})`,
              },
            },
            id: fc.id || "",
            name: fc.name || "",
          });
        } else if (fc.name === showStepImageFullscreenDeclaration.name) {
          if (shownStep) {
            setIsStepImageFullscreen(true);
            functionResponses.push({
              response: {
                output: {
                  success: true,
                  message: "Step image shown fullscreen",
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
                  error: "No step image available to show fullscreen",
                },
              },
              id: fc.id || "",
              name: fc.name || "",
            });
          }
        } else if (fc.name === hideStepImageFullscreenDeclaration.name) {
          setIsStepImageFullscreen(false);
          functionResponses.push({
            response: {
              output: {
                success: true,
                message: "Fullscreen step image hidden",
              },
            },
            id: fc.id || "",
            name: fc.name || "",
          });
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
  }, [client, recipe, setRecipe, startTimer, searchRecipes, recipesReady, shownStep]);

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
