"use client";

import {
  LiveAPIProvider,
  useLiveAPIContext,
} from "@/contexts/live-api-context";
import { RecipeProvider, useRecipeContext } from "@/contexts/recipe-context";
import { AudioRecorder } from "@/lib/audio-recorder";
import { useEffect, useState } from "react";

function Inside() {
  const { client, connected, connect, disconnect } = useLiveAPIContext();
  const { recipe, setRecipe } = useRecipeContext();
  const [audioRecorder] = useState(() => new AudioRecorder());
  const [muted, setMuted] = useState(false);
  const [inVolume, setInVolume] = useState(0);

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

  const [maxVolumeReached, setMaxVolumeReached] = useState(0);

  useEffect(() => {
    if (inVolume > maxVolumeReached) {
      setMaxVolumeReached(inVolume);
    }
  }, [inVolume]);

  const scale = 1 + (1 / 24) * (inVolume * 100);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
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

      {/* Main content area */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 pb-8">
        {/* Big mic button in center */}
        <div className="mb-8">
          <button
            onClick={() => (connected ? disconnect() : connect())}
            className={`w-24 h-24 sm:w-32 sm:h-32 rounded-full flex items-center justify-center shadow-2xl transition-all duration-300 relative ${
              connected
                ? "bg-gradient-to-br from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 scale-105"
                : "bg-gradient-to-br from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 hover:scale-105"
            }`}
          >
            <span className="text-white text-3xl sm:text-4xl z-10">
              {connected ? "⏹️" : "🎤"}
            </span>
            <div
              style={{
                scale: scale,
              }}
              className="absolute top-0 left-0 w-full h-full rounded-full border-2 border-green-500 bg-green-500/20 opacity-50 "
            ></div>
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
              {connected ? "Listening..." : "Tap to start"}
            </span>
          </div>
        </div>

        {/* Mute button */}
        {connected && (
          <button
            onClick={() => setMuted(!muted)}
            className={`px-6 py-3 rounded-full font-medium transition-all shadow-lg mb-6 ${
              muted
                ? "bg-red-500 hover:bg-red-600 text-white"
                : "bg-white hover:bg-gray-50 text-gray-700 border border-gray-200"
            }`}
          >
            {muted ? "🔇 Unmute" : "🎤 Mute"}
          </button>
        )}

        {/* Instructions */}
        {!recipe && connected && (
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
            <button
              onClick={() => setRecipe(null)}
              className="text-sm text-green-600 hover:text-green-700 bg-green-50 px-4 py-2 rounded-full transition-colors"
            >
              Choose different recipe
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
import { ToolCall } from "@/components/tool-call";
import { TextInput } from "@/components/text-input";
import { useQuery } from "@tanstack/react-query";
import { AuthToken } from "@google/genai";

export default function Home() {
  const { data: token } = useQuery({
    queryFn: async () => {
      const response = await fetch("/api/ephemeral-token");
      const data = await response.json();
      return data.token as AuthToken;
    },
    queryKey: ["ephemeral-token"],
  });

  if (!token) {
    return <div>Loading...</div>;
  }

  if (!token.name) {
    return <div>No token name </div>;
  }

  return (
    <LiveAPIProvider
      options={{
        apiKey: token.name,
        httpOptions: { apiVersion: "v1alpha" },
      }}
    >
      <RecipeProvider>
        <div className="relative">
          <Inside />
          <TextInput />
          <ToolCall />
        </div>
      </RecipeProvider>
    </LiveAPIProvider>
  );
}
