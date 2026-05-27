import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { GenAILiveClient } from "../lib/genai-live-client";
import { LiveClientOptions } from "../types";
import { FunctionTool, RealtimeSessionConfig } from "@openai/agents/realtime";

type LiveFunctionTool = FunctionTool<any, any, any>;

export type UseLiveAPIResults = {
  client: GenAILiveClient;
  setConfig: (config: Partial<RealtimeSessionConfig>) => void;
  config: Partial<RealtimeSessionConfig>;
  model: string;
  setModel: (model: string) => void;
  setTools: (tools: LiveFunctionTool[]) => void;
  connected: boolean;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  volume: number;
};

const systemInstruction = `Tu es un assistant qui aide les utilisateurs à trouver et cuisiner des recettes HelloFresh.

Tu peux:
1. Chercher et sélectionner automatiquement des recettes en utilisant la fonction 'search_and_select_recipe' avec une requête (ingrédients, cuisine, nom de plat, etc.). Cette fonction trouvera des recettes correspondantes et sélectionnera automatiquement la première recette trouvée.
2. Afficher une étape spécifique d'une recette en utilisant 'render_step' avec le numéro de l'étape (seulement si une recette est actuellement sélectionnée).
3. Répondre aux questions sur les recettes et guider l'utilisateur dans la préparation.

Si l'utilisateur n'a pas encore de recette, encourage-le à chercher une recette. Si une recette est sélectionnée, aide-le avec cette recette.

À chaque fois que tu parles d'une etape, tu dois montrer l'etape avec la fonction 'render_step'
`;

export function useLiveAPI(options: LiveClientOptions): UseLiveAPIResults {
  const client = useMemo(
    () =>
      new GenAILiveClient({
        ...options,
        systemInstruction: options.systemInstruction || systemInstruction,
      }),
    [options],
  );
  const apiKeyRef = useRef(options.apiKey);

  const [model, setModel] = useState<string>(
    "gpt-realtime-2"
  );

  // Static config that never changes to prevent re-renders
  const config: Partial<RealtimeSessionConfig> = useMemo(
    () => ({
      outputModalities: ["audio"],
      reasoning: {
        effort: "low",
      },
      parallelToolCalls: true,
      audio: {
        input: {
          format: "pcm16",
          transcription: {
            model: "gpt-4o-mini-transcribe",
          },
          turnDetection: {
            type: "server_vad",
          },
        },
        output: {
          format: "pcm16",
        },
      },
    }),
    [],
  );

  const [connected, setConnected] = useState(false);
  const [volume, setVolume] = useState(0);

  useEffect(() => {
    const onOpen = () => {
      console.log("onOpen");
      setConnected(true);
    };

    const onClose = (e: any) => {
      console.log("onClose", e);
      setConnected(false);
    };

    const onError = (error: unknown) => {
      console.log("onError");
      console.error("error", error);
    };

    const stopAudioStreamer = () => {
      console.log("stopAudioStreamer");
    };

    const onAudio = (data: ArrayBuffer) => {
      console.log("onAudio");
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
    await client.connect(model, config, apiKeyRef.current);
  }, [client, config, model]);

  const disconnect = useCallback(async () => {
    client.disconnect();
    setConnected(false);
  }, [setConnected, client]);

  const setTools = useCallback(
    (tools: LiveFunctionTool[]) => client.setTools(tools),
    [client],
  );

  return {
    client,
    config,
    setConfig: () => {}, // No-op function since config is now static
    model,
    setModel,
    setTools,
    connected,
    connect,
    disconnect,
    volume,
  };
}
