"use client";

import {
  LiveAPIProvider,
  useLiveAPIContext,
} from "@/contexts/live-api-context";
import { useLiveAPI } from "@/hooks/use-live-api";
import { AudioRecorder } from "@/lib/audio-recorder";
import Image from "next/image";
import { useEffect, useState } from "react";

if (!process.env.NEXT_PUBLIC_GEMINI_API_KEY) {
  throw new Error("NEXT_PUBLIC_GEMINI_API_KEY is not set");
}

function Inside() {
  const { client, connected, connect, disconnect } = useLiveAPIContext();

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

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg">
      <div className="flex flex-col gap-4">
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
import { Modality } from "@google/genai";
import { ToolCall } from "@/components/tool-call";
import { TextInput } from "@/components/text-input";

export default function Home() {
  return (
    <LiveAPIProvider
      options={{
        apiKey: process.env.NEXT_PUBLIC_GEMINI_API_KEY!,
      }}
    >
      <ToolCall />
      <TextInput />
      <Inside />
    </LiveAPIProvider>
  );
}
