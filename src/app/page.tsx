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
    <div className=" px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center ">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            HelloFresh AI Assistant
          </h1>
          <p className="text-gray-600">
            Your smart cooking companion for HelloFresh recipes
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-lg border border-green-100 p-8 mb-6">
          <div className="flex flex-col gap-6">
            {!recipe && (
              <div className="border-b border-green-100 pb-6">
                <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                  Add Recipe URL
                </h2>
                <form onSubmit={handleRecipeUrlSubmit} className="flex gap-3">
                  <input
                    type="url"
                    value={recipeUrl}
                    onChange={(e) => setRecipeUrl(e.target.value)}
                    placeholder="Enter HelloFresh recipe URL..."
                    className="flex-1 px-4 py-3 border border-green-200 rounded-xl bg-green-50/50 text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                    required
                  />
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="px-6 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium shadow-sm hover:shadow-md"
                  >
                    {isLoading ? (
                      <span className="flex items-center gap-2">
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
              <div className="border-b border-green-100 pb-6">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-xl font-semibold text-gray-800 mb-2">
                      {recipe.name}
                    </h2>
                    <p className="text-gray-600 mb-3">{recipe.description}</p>
                  </div>
                  <button
                    onClick={() => {
                      setRecipe(null);
                      setRecipeUrl("");
                    }}
                    className="text-sm text-green-600 hover:text-green-700 bg-green-50 px-3 py-1 rounded-lg transition-colors"
                  >
                    Change Recipe
                  </button>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-green-50 rounded-xl">
                  <div className="text-gray-700">
                    <span className="text-sm font-medium">Audio Volume</span>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                      <span className="font-mono text-sm">{inVolume}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => setMuted(!muted)}
                    className={`px-4 py-2 rounded-lg font-medium transition-all shadow-sm ${
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
                <div className="flex items-center justify-between p-4 bg-green-50 rounded-xl">
                  <div className="text-gray-700">
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
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm font-medium"
                    >
                      Connect
                    </button>
                    <button
                      onClick={() => disconnect()}
                      disabled={!connected}
                      className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm font-medium"
                    >
                      Disconnect
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
import { ToolCall } from "@/components/tool-call";
import { TextInput } from "@/components/text-input";

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
      {/* <TextInput /> */}
      <ToolCall recipe={recipe} />
    </LiveAPIProvider>
  );
}
