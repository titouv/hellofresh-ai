import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { GenAILiveClient } from "../lib/genai-live-client";
import { LiveClientOptions } from "../types";
import { AudioStreamer } from "../lib/audio-streamer";
import { audioContext } from "../lib/utils";
import VolMeterWorket from "../lib/worklets/vol-meter";
import {
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

const systemIntruction: LiveConnectConfig["systemInstruction"] = {
  parts: [
    {
      text: `Tu es un assistant qui aide les utilisateurs à trouver et cuisiner des recettes HelloFresh.

Tu peux:
1. Chercher et sélectionner automatiquement des recettes en utilisant la fonction 'search_and_select_recipe' avec une requête (ingrédients, cuisine, nom de plat, etc.). Cette fonction trouvera des recettes correspondantes et sélectionnera automatiquement la première recette trouvée.
2. Afficher une étape spécifique d'une recette en utilisant 'render_step' avec le numéro de l'étape (seulement si une recette est actuellement sélectionnée).
3. Répondre aux questions sur les recettes et guider l'utilisateur dans la préparation.

Si l'utilisateur n'a pas encore de recette, encourage-le à chercher une recette. Si une recette est sélectionnée, aide-le avec cette recette.

À chaque fois que tu parles d'une etape, tu dois montrer l'etape avec la fonction 'render_step'
`,
    },
  ],
};

export function useLiveAPI(options: LiveClientOptions): UseLiveAPIResults {
  const client = useMemo(() => new GenAILiveClient(options), [options]);
  const audioStreamerRef = useRef<AudioStreamer | null>(null);

  const [model, setModel] = useState<string>(
    // "models/gemini-2.5-flash-preview-native-audio-dialog"
    "models/gemini-2.0-flash-live-001"
  );

  // Static config that never changes to prevent re-renders
  const config: LiveConnectConfig = useMemo(
    () => ({
      httpOptions: { apiVersion: "v1alpha" },
      responseModalities: [Modality.AUDIO],
      // mediaResolution: MediaResolution.MEDIA_RESOLUTION_MEDIUM,
      speechConfig: {
        languageCode: "fr-FR",
        voiceConfig: {
          prebuiltVoiceConfig: {
            voiceName: "Puck",
          },
        },
      },
      realtimeInputConfig: {
        turnCoverage: TurnCoverage.TURN_INCLUDES_ALL_INPUT,
      },
      tools: toolsForConfig,
      systemInstruction: systemIntruction, // Static system instruction
    }),
    []
  );

  const [connected, setConnected] = useState(false);
  const [volume, setVolume] = useState(0);

  // Remove the dynamic system instruction update effect completely

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
    console.log("connect", model, config);
    await client.connect(model, config);
  }, [client, config, model]);

  const disconnect = useCallback(async () => {
    client.disconnect();
    setConnected(false);
  }, [setConnected, client]);

  return {
    client,
    config,
    setConfig: () => {}, // No-op function since config is now static
    model,
    setModel,
    connected,
    connect,
    disconnect,
    volume,
  };
}
