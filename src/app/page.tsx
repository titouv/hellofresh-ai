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
    <div className="max-w-2xl mx-auto p-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg">
      <div className="flex flex-col gap-4">
        {!recipe && (
          <div className="border-b pb-4">
            <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Add Recipe URL
            </h2>
            <form onSubmit={handleRecipeUrlSubmit} className="flex gap-2">
              <input
                type="url"
                value={recipeUrl}
                onChange={(e) => setRecipeUrl(e.target.value)}
                placeholder="Enter HelloFresh recipe URL..."
                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                required
              />
              <button
                type="submit"
                disabled={isLoading}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
              >
                {isLoading ? "Loading..." : "Load Recipe"}
              </button>
            </form>
          </div>
        )}

        {recipe && (
          <div className="border-b pb-4">
            <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-300">
              {recipe.name}
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {recipe.description}
            </p>
            <button
              onClick={() => {
                setRecipe(null);
                setRecipeUrl("");
              }}
              className="mt-2 text-sm text-blue-500 hover:text-blue-600"
            >
              Change Recipe
            </button>
          </div>
        )}

        <div className="flex items-center justify-between">
          <div className="text-gray-700 dark:text-gray-300">
            Volume: <span className="font-mono">{inVolume}</span>
          </div>
          <button
            onClick={() => setMuted(!muted)}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              muted
                ? "bg-red-500 hover:bg-red-600 text-white"
                : "bg-green-500 hover:bg-green-600 text-white"
            }`}
          >
            {muted ? "Unmute" : "Mute"}
          </button>
        </div>

        <div className="flex items-center justify-between">
          <div className="text-gray-700 dark:text-gray-300">
            Status:{" "}
            <span
              className={`font-mono ${
                connected ? "text-green-500" : "text-red-500"
              }`}
            >
              {connected ? "Connected" : "Disconnected"}
            </span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => connect()}
              disabled={connected}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Connect
            </button>
            <button
              onClick={() => disconnect()}
              disabled={!connected}
              className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Disconnect
            </button>
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
      {/* <TextInput /> */}
      <Inside recipe={recipe} setRecipe={setRecipe} />
      <ToolCall recipe={recipe} />
    </LiveAPIProvider>
  );
}
