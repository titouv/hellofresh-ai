"use client";

import {
  LiveAPIProvider,
  useLiveAPIContext,
} from "@/contexts/live-api-context";
import {
  CookingHistoryItem,
  RecipeProvider,
  useRecipeContext,
} from "@/contexts/recipe-context";
import { useEffect, useRef, useState } from "react";
import { useWakeLock } from "@/hooks/use-wake-lock";
import { Mic, Square, VolumeX } from "lucide-react";
import { scrapeRecipeServerFn } from "@/server_functions";

function Inside() {
  const { client, connected, connect, disconnect } = useLiveAPIContext();
  const {
    recipe,
    setRecipe,
    servingSize,
    setServingSize,
    recipesLoading,
    recipesError,
    recipesReady,
    cookingHistory,
    clearCookingHistory,
  } = useRecipeContext();
  const [muted, setMuted] = useState(false);
  const [inVolume, setInVolume] = useState(0);
  const [historyLoadingId, setHistoryLoadingId] = useState<string | null>(null);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const lastAnnouncedRecipeId = useRef<string | null>(null);
  const servingOptions = [2, 3, 4, 5, 6];
  // Keep screen awake while connected (recording session active)
  useWakeLock(connected);

  useEffect(() => {
    if (connected) {
      client.mute(muted);
    }
    setInVolume(muted ? 0 : 0.2);
  }, [client, connected, muted]);

  const [maxVolumeReached, setMaxVolumeReached] = useState(0);

  useEffect(() => {
    if (inVolume > maxVolumeReached) {
      setMaxVolumeReached(inVolume);
    }
  }, [inVolume]);

  useEffect(() => {
    if (!connected) {
      return;
    }
    const nextId = recipe?.id || recipe?.recipeId || null;
    if (nextId === lastAnnouncedRecipeId.current) {
      return;
    }
    lastAnnouncedRecipeId.current = nextId;
    if (recipe) {
      const servingsNote = Number.isFinite(servingSize)
        ? ` Portions: ${servingSize}.`
        : "";
      client.send({
        text: `RETOUR SYSTEME: Recette sélectionnée "${recipe.name}". Description: ${recipe.description}.${servingsNote}`,
      });
    } else {
      client.send({
        text: "RETOUR SYSTEME: Aucune recette sélectionnée.",
      });
    }
  }, [client, connected, recipe]);

  const scale = 1 + (1 / 24) * (inVolume * 100);
  const baseImageUrl =
    "https://img.hellofresh.com/w_384,q_auto,f_auto,c_limit,fl_lossy/hellofresh_s3/";

  const formatCookedAt = (value: string) => {
    const cookedDate = new Date(value);
    if (Number.isNaN(cookedDate.getTime())) {
      return "Recently cooked";
    }
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(cookedDate);
  };

  const handleStartFromHistory = async (item: CookingHistoryItem) => {
    if (!item.url || historyLoadingId) {
      setHistoryError(
        item.url
          ? "Another recipe is loading. Please wait."
          : "Missing recipe link for this entry.",
      );
      return;
    }
    setHistoryError(null);
    setHistoryLoadingId(item.id);
    try {
      const fullRecipe = await scrapeRecipeServerFn(item.url);
      setRecipe(fullRecipe);
    } catch (error) {
      console.warn("Failed to load recipe from history:", error);
      setHistoryError("Failed to load that recipe.");
    } finally {
      setHistoryLoadingId(null);
    }
  };

  return (
    <div className="min-h-[100dvh] flex flex-col">
      {/* Logo at top */}
      <div className="text-center pt-8 pb-4">
        <div className="inline-flex items-center gap-3 mb-2">
          <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-2xl flex items-center justify-center shadow-lg">
            <span className="text-white text-xl font-bold">HF</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">
            HelloFresh AI
          </h1>
        </div>
        <p className="text-gray-600 text-sm">Your smart cooking companion</p>
      </div>

      {/* Recipe loading status */}
      {recipesLoading && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 mx-6 mb-4">
          <div className="flex items-center gap-2">
            <svg
              className="animate-spin h-4 w-4 text-green-600"
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
            <span className="text-sm text-green-700">
              Loading recipe database...
            </span>
          </div>
        </div>
      )}

      {recipesError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 mx-6 mb-4">
          <p className="text-sm text-red-700">
            Failed to load recipes: {recipesError}
          </p>
        </div>
      )}

      {recipesReady && !recipesLoading && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 mx-6 mb-4">
          <p className="text-sm text-green-700">
            ✓ Recipe database loaded - Ready to search!
          </p>
        </div>
      )}

      {/* Main content area */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 pb-8">
        {/* Serving size pre-selection */}
        {!recipe && (
          <div className="text-center mb-6">
            <p className="text-xs font-medium text-gray-500 mb-2">
              Combien de personnes pour cette recette ?
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2">
              {servingOptions.map((option) => (
                <button
                  key={option}
                  onClick={() => setServingSize(option)}
                  className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                    servingSize === option
                      ? "bg-green-600 border-green-600 text-white"
                      : "bg-white border-gray-200 text-gray-600 hover:border-green-300 hover:text-green-700"
                  }`}
                >
                  {option} pers.
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Big mic button in center */}
        <div className="mb-8">
          <button
            onClick={() => (connected ? disconnect() : connect())}
            disabled={!recipesReady}
            className={`w-24 h-24 sm:w-32 sm:h-32 rounded-full flex items-center justify-center shadow-2xl transition-all duration-300 relative ${
              !recipesReady
                ? "bg-gray-400 cursor-not-allowed"
                : connected
                  ? "bg-gradient-to-br from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 scale-105"
                  : "bg-gradient-to-br from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 hover:scale-105"
            }`}
          >
            <span className="text-white text-3xl sm:text-4xl z-10">
              {connected ? <Square size={32} /> : <Mic size={32} />}
            </span>
            {parseFloat(scale.toFixed(2)) > 1.001 && (
              <div
                style={{
                  scale: scale,
                }}
                className="absolute top-0 left-0 w-full h-full rounded-full border-2 border-green-500 bg-green-500/20 opacity-50 "
              ></div>
            )}
          </button>
        </div>

        {/* Connection status */}
        <div className="text-center mb-6">
          <div className="flex items-center justify-center gap-2 mb-2">
            <div
              className={`w-3 h-3 rounded-full ${
                connected ? "bg-green-500 animate-pulse" : "bg-gray-400"
              }`}
            ></div>
            <span className="text-sm font-medium text-gray-700">
              {!recipesReady
                ? "Loading recipes..."
                : connected
                  ? "Listening..."
                  : "Tap to start"}
            </span>
          </div>
        </div>

        {/* Mute button */}
        {connected && (
          <button
            onClick={() => setMuted(!muted)}
            className={`px-6 py-3 rounded-full font-medium transition-all shadow-lg mb-6 flex items-center justify-center ${
              muted
                ? "bg-red-500 hover:bg-red-600 text-white"
                : "bg-white hover:bg-gray-50 text-gray-700 border border-gray-200"
            }`}
          >
            {muted ? (
              <>
                <VolumeX size={16} className="mr-2" />
                Unmute
              </>
            ) : (
              <>
                <Mic size={16} className="mr-2" />
                Mute
              </>
            )}
          </button>
        )}

        {/* Instructions */}
        {!recipe && connected && recipesReady && (
          <div className="max-w-sm text-center">
            <p className="text-gray-600 text-sm leading-relaxed">
              Try saying: <br />
              <span className="italic">"Search for a pasta recipe"</span>
              <br />
              <span className="italic">"I want to cook chicken"</span>
            </p>
          </div>
        )}

        {/* Recipe header */}
        {recipe && (
          <div className="max-w-sm text-center mb-4">
            <h2 className="text-lg font-semibold text-gray-800 mb-2">
              {recipe.name}
            </h2>
            <p className="text-gray-600 text-sm mb-3">{recipe.description}</p>
            {Number.isFinite(servingSize) && (
              <p className="text-xs text-gray-500 mb-3">
                Portions sélectionnées: {servingSize} pers.
              </p>
            )}
            <button
              onClick={() => setRecipe(null)}
              className="text-sm text-green-600 hover:text-green-700 bg-green-50 px-4 py-2 rounded-full transition-colors"
            >
              Choose different recipe
            </button>
          </div>
        )}

        {cookingHistory.length > 0 && (
          <div className="w-full max-w-sm">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-700">
                Cooking history
              </h3>
              <button
                onClick={clearCookingHistory}
                className="text-xs text-gray-500 hover:text-gray-700"
              >
                Clear
              </button>
            </div>
            {historyError && (
              <div className="mb-3 text-xs text-red-600 bg-red-50 border border-red-100 rounded-md px-3 py-2">
                {historyError}
              </div>
            )}
            <div className="space-y-2">
              {cookingHistory.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-3 bg-white border border-gray-200 rounded-lg p-2 shadow-sm"
                >
                  <div className="w-14 h-14 rounded-md overflow-hidden bg-gray-100 shrink-0">
                    {item.imagePath ? (
                      <img
                        src={baseImageUrl + item.imagePath}
                        alt={item.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gray-200" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">
                      {item.name}
                    </p>
                    <p className="text-xs text-gray-500 truncate">
                      {item.description}
                    </p>
                    <p className="text-[11px] text-gray-400 mt-1">
                      {formatCookedAt(item.cookedAt)}
                    </p>
                  </div>
                  <button
                    onClick={() => handleStartFromHistory(item)}
                    disabled={!item.url || historyLoadingId === item.id}
                    className={`ml-auto text-xs px-3 py-1 rounded-full border transition-colors ${
                      !item.url
                        ? "border-gray-200 text-gray-300 cursor-not-allowed"
                        : historyLoadingId === item.id
                          ? "border-green-200 text-green-700 bg-green-50"
                          : "border-green-500 text-green-700 hover:bg-green-50"
                    }`}
                  >
                    {historyLoadingId === item.id ? "Starting..." : "Start"}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
import { ToolCall } from "@/components/tool-call";
import { TextInput } from "@/components/text-input";
import { TimerDisplay } from "@/components/timer-display";
import { useQuery } from "@tanstack/react-query";

type RealtimeClientToken = {
  value: string;
  expires_at: number;
};

export default function Home() {
  const { data: token } = useQuery({
    queryFn: async () => {
      const response = await fetch("/api/ephemeral-token");
      const data = await response.json();
      return data.token as RealtimeClientToken;
    },
    queryKey: ["ephemeral-token"],
  });

  if (!token) {
    return (
      <div className="min-h-[100dvh] flex flex-col items-center justify-center">
        <div className="text-center">
          <div className="inline-flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-2xl flex items-center justify-center shadow-lg">
              <span className="text-white text-xl font-bold">HF</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">
              HelloFresh AI
            </h1>
          </div>
          <div className="flex items-center justify-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
            <div className="w-2 h-2 bg-green-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
            <div className="w-2 h-2 bg-green-500 rounded-full animate-bounce"></div>
          </div>
          <p className="text-gray-600 text-sm mt-4">
            Connecting to your cooking companion...
          </p>
        </div>
      </div>
    );
  }

  if (!token.value) {
    return <div>No realtime token</div>;
  }

  return (
    <LiveAPIProvider
      options={{
        apiKey: token.value,
      }}
    >
      <RecipeProvider>
        <div className="relative">
          <Inside />
          <TextInput />
          <ToolCall />
          <TimerDisplay />
        </div>
      </RecipeProvider>
    </LiveAPIProvider>
  );
}
