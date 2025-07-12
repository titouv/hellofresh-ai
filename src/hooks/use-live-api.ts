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

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { GenAILiveClient } from "../lib/genai-live-client";
import { LiveClientOptions } from "../types";
import { AudioStreamer } from "../lib/audio-streamer";
import { audioContext } from "../lib/utils";
import VolMeterWorket from "../lib/worklets/vol-meter";
import { RecipeScraped } from "../../recipe_types";
import {
  ActivityHandling,
  LiveConnectConfig,
  MediaResolution,
  Modality,
  TurnCoverage,
} from "@google/genai";
import { toolsForConfig } from "@/components/tool-call";

export type UseLiveAPIResults = {
  client: GenAILiveClient;
  setConfig: (config: LiveConnectConfig) => void;
  config: LiveConnectConfig;
  model: string;
  setModel: (model: string) => void;
  connected: boolean;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  volume: number;
};

const createSystemInstruction = (
  recipe: RecipeScraped | null
): LiveConnectConfig["systemInstruction"] => {
  if (!recipe) {
    return {
      parts: [
        {
          text: `Tu es un assistant qui répond aux questions sur les recettes de cuisine. L'utilisateur n'a pas encore fourni de recette. Demande-lui de fournir une URL de recette HelloFresh pour commencer.`,
        },
      ],
    };
  }

  const recipeSteps = recipe.steps
    .map((step, index) => `${index + 1}. ${step.instructions}`)
    .join("\n");

  return {
    parts: [
      {
        text: `Tu es un assistant qui répond aux questions sur la recette de cuisine suivante.`,
      },
      {
        text: `Voici la recette : ${recipe.name}

${recipe.description}

Étapes de la recette :
${recipeSteps}

Réponds aux questions de l'utilisateur concernant cette recette et guide-le dans la préparation.`,
      },
    ],
  };
};

export function useLiveAPI(
  options: LiveClientOptions,
  recipe?: RecipeScraped | null
): UseLiveAPIResults {
  const client = useMemo(() => new GenAILiveClient(options), [options]);
  const audioStreamerRef = useRef<AudioStreamer | null>(null);

  const [model, setModel] = useState<string>(
    "models/gemini-2.5-flash-preview-native-audio-dialog"
  );

  const defaultConfig: LiveConnectConfig = useMemo(
    () => ({
      responseModalities: [Modality.AUDIO],
      mediaResolution: MediaResolution.MEDIA_RESOLUTION_MEDIUM,
      speechConfig: {
        languageCode: "fr-FR",
        voiceConfig: {
          prebuiltVoiceConfig: {
            voiceName: "Puck",
          },
        },
      },
      tools: toolsForConfig,
      systemInstruction: createSystemInstruction(recipe || null),
    }),
    [recipe]
  );

  const [config, setConfig] = useState<LiveConnectConfig>(defaultConfig);
  const [connected, setConnected] = useState(false);
  const [volume, setVolume] = useState(0);

  useEffect(() => {
    setConfig(defaultConfig);
  }, [defaultConfig]);

  // register audio for streaming server -> speakers
  useEffect(() => {
    if (!audioStreamerRef.current) {
      audioContext({ id: "audio-out" }).then((audioCtx: AudioContext) => {
        audioStreamerRef.current = new AudioStreamer(audioCtx);
        audioStreamerRef.current
          .addWorklet<any>("vumeter-out", VolMeterWorket, (ev: any) => {
            setVolume(ev.data.volume);
          })
          .then(() => {
            // Successfully added worklet
          });
      });
    }
  }, [audioStreamerRef]);

  useEffect(() => {
    const onOpen = () => {
      console.log("onOpen");
      setConnected(true);
    };

    const onClose = (e: any) => {
      console.log("onClose", e);
      setConnected(false);
    };

    const onError = (error: ErrorEvent) => {
      console.log("onError");
      console.error("error", error);
    };

    const stopAudioStreamer = () => {
      console.log("stopAudioStreamer");
      return audioStreamerRef.current?.stop();
    };

    const onAudio = (data: ArrayBuffer) => {
      console.log("onAudio");
      return audioStreamerRef.current?.addPCM16(new Uint8Array(data));
    };

    client
      .on("error", onError)
      .on("open", onOpen)
      .on("close", onClose)
      .on("interrupted", stopAudioStreamer)
      .on("audio", onAudio);

    return () => {
      client
        .off("error", onError)
        .off("open", onOpen)
        .off("close", onClose)
        .off("interrupted", stopAudioStreamer)
        .off("audio", onAudio)
        .disconnect();
    };
  }, [client]);

  const connect = useCallback(async () => {
    if (!config) {
      throw new Error("config has not been set");
    }
    client.disconnect();
    await client.connect(model, config);
  }, [client, config, model]);

  const disconnect = useCallback(async () => {
    client.disconnect();
    setConnected(false);
  }, [setConnected, client]);

  return {
    client,
    config,
    setConfig,
    model,
    setModel,
    connected,
    connect,
    disconnect,
    volume,
  };
}
