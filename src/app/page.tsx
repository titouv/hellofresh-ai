"use client";

import {
  LiveAPIProvider,
  useLiveAPIContext,
} from "@/contexts/live-api-context";
import { AudioRecorder } from "@/lib/audio-recorder";
import { useEffect, useState } from "react";
import { RecipeScraped } from "../../recipe_types";

const scrapeRecipe = async (url: string): Promise<RecipeScraped> => {
  const response = await fetch(`/api/proxy?url=${encodeURIComponent(url)}`);
  if (!response.ok) {
    throw new Error("Failed to scrape recipe");
  }
  const data = await response.json();
  return data;
};

if (!process.env.NEXT_PUBLIC_GEMINI_API_KEY) {
  throw new Error("NEXT_PUBLIC_GEMINI_API_KEY is not set");
}

function Inside({
  recipe,
  setRecipe,
}: {
  recipe: RecipeScraped | null;
  setRecipe: (recipe: RecipeScraped | null) => void;
}) {
  const { client, connected, connect, disconnect } = useLiveAPIContext();
  const [recipeUrl, setRecipeUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const [audioRecorder] = useState(() => new AudioRecorder());
  const [muted, setMuted] = useState(false);
  const [inVolume, setInVolume] = useState(0);

  const handleRecipeUrlSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recipeUrl.trim()) return;

    setIsLoading(true);
    try {
      const scrapedRecipe = await scrapeRecipe(recipeUrl);
      setRecipe(scrapedRecipe);
    } catch (error) {
      console.error("Error scraping recipe:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const onData = (base64: string) => {
      client.sendRealtimeInput([
        {
          mimeType: "audio/pcm;rate=16000",
          data: base64,
        },
      ]);
    };
    if (connected && !muted && audioRecorder) {
      audioRecorder.on("data", onData).on("volume", setInVolume).start();
    } else {
      audioRecorder.stop();
    }
    return () => {
      audioRecorder.off("data", onData).off("volume", setInVolume);
    };
  }, [connected, client, muted, audioRecorder]);

  return (
    <div className="px-4 py-6">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-2">
            HelloFresh AI Assistant
          </h1>
          <p className="text-gray-600 text-sm sm:text-base">
            Your smart cooking companion for HelloFresh recipes
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-lg border border-green-100 p-4 sm:p-6 lg:p-8 mb-6">
          <div className="flex flex-col gap-4 sm:gap-6">
            {!recipe && (
              <div className="border-b border-green-100 pb-4 sm:pb-6">
                <h2 className="text-lg sm:text-xl font-semibold text-gray-800 mb-3 sm:mb-4 flex items-center gap-2">
                  <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                  Add Recipe URL
                </h2>
                <form onSubmit={handleRecipeUrlSubmit} className="flex flex-col sm:flex-row gap-3">
                  <input
                    type="url"
                    value={recipeUrl}
                    onChange={(e) => setRecipeUrl(e.target.value)}
                    placeholder="Enter HelloFresh recipe URL..."
                    className="flex-1 px-4 py-3 border border-green-200 rounded-xl bg-green-50/50 text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all text-sm sm:text-base"
                    required
                  />
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full sm:w-auto px-6 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium shadow-sm hover:shadow-md text-sm sm:text-base min-h-[44px]"
                  >
                    {isLoading ? (
                      <span className="flex items-center justify-center gap-2">
                        <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                        Loading...
                      </span>
                    ) : (
                      "Load Recipe"
                    )}
                  </button>
                </form>
              </div>
            )}

            {recipe && (
              <div className="border-b border-green-100 pb-4 sm:pb-6">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="flex-1">
                    <h2 className="text-lg sm:text-xl font-semibold text-gray-800 mb-2">
                      {recipe.name}
                    </h2>
                    <p className="text-gray-600 mb-3 text-sm sm:text-base">{recipe.description}</p>
                  </div>
                  <button
                    onClick={() => {
                      setRecipe(null);
                      setRecipeUrl("");
                    }}
                    className="text-sm text-green-600 hover:text-green-700 bg-green-50 px-3 py-2 rounded-lg transition-colors self-start min-h-[36px]"
                  >
                    Change Recipe
                  </button>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-green-50 rounded-xl gap-3">
                  <div className="text-gray-700 flex-1">
                    <span className="text-sm font-medium">Audio Volume</span>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                      <span className="font-mono text-sm">{inVolume}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => setMuted(!muted)}
                    className={`w-full sm:w-auto px-4 py-2 rounded-lg font-medium transition-all shadow-sm min-h-[44px] text-sm ${
                      muted
                        ? "bg-red-500 hover:bg-red-600 text-white"
                        : "bg-green-600 hover:bg-green-700 text-white"
                    }`}
                  >
                    {muted ? "🔇 Unmute" : "🎤 Mute"}
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-green-50 rounded-xl gap-3">
                  <div className="text-gray-700 flex-1">
                    <span className="text-sm font-medium">
                      Connection Status
                    </span>
                    <div className="flex items-center gap-2 mt-1">
                      <div
                        className={`w-2 h-2 rounded-full ${
                          connected
                            ? "bg-green-500 animate-pulse"
                            : "bg-red-500"
                        }`}
                      ></div>
                      <span className="font-mono text-sm">
                        {connected ? "Connected" : "Disconnected"}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => connect()}
                      disabled={connected}
                      className="flex-1 sm:flex-none px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm font-medium min-h-[44px]"
                    >
                      Connect
                    </button>
                    <button
                      onClick={() => disconnect()}
                      disabled={!connected}
                      className="flex-1 sm:flex-none px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm font-medium min-h-[44px]"
                    >
                      Disconnect
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {recipe && (
              <div className="mt-6">
                <RecipeSteps steps={recipe.steps} />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
import { ToolCall } from "@/components/tool-call";
import { RecipeSteps } from "@/components/recipe-steps";

export default function Home() {
  const [recipe, setRecipe] = useState<RecipeScraped | null>(null);

  return (
    <LiveAPIProvider
      options={{
        apiKey: process.env.NEXT_PUBLIC_GEMINI_API_KEY!,
      }}
      recipe={recipe}
    >
      <Inside recipe={recipe} setRecipe={setRecipe} />
      <ToolCall recipe={recipe} />
    </LiveAPIProvider>
  );
}
