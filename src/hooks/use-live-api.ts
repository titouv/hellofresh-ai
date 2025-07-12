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
import {
  ActivityHandling,
  LiveConnectConfig,
  MediaResolution,
  Modality,
  TurnCoverage,
} from "@google/genai";

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

const systemInstruction: LiveConnectConfig["systemInstruction"] = {
  parts: [
    {
      text: `Tu es un assistant qui répond au question sur la recette de cuisine.`,
    },
    {
      text: `Voici la recette : FILET MIGNON ET MARINADE À L’ORANGE

PRÉPARER LA MARINADE
Préchauffez le four à 200 degrés et pressez
l’orange. Ajoutez 21/2 cs de jus par personne,
le vinaigre balsamique blanc, le miel ainsi que
du sel et du poivre à la petite casserole et faites
chauffer à feu moyen-vif pendant 6 à 8 minutes,
jusqu’à ce que le volume ait réduit de moitié.
CUIRE LES POMMES DE TERRE
Pendant ce temps, portez une grande
quantité d’eau à ébullition dans la casserole
pour les pommes de terre. Épluchez-les et
coupez-les grossièrement. Faites-les cuire 12 à
15 minutes. Ensuite, égouttez-les et réservez
avec le couvercle.
CUIRE LA VIANDE
Pendant ce temps, faites chauffer l’huile
d’olive à feu moyen-vif dans la sauteuse. Salez
et poivrez le filet mignon, puis saisissez-le
sur tous les côtés pendant 4 minutes. Mettez
la viande dans le plat à four, arrosez-la avec
la marinade et enfournez-la 8 à 12 minutes.
Retournez-la à mi-cuisson et arrosez-la avec un
peu de la marinade du plat. Sortez la viande du
four et laissez-la reposer dans de l’aluminium.
Conservez la marinade.
ÉTUVER LA LITTLE GEM
Pendant ce temps, coupez la little gem en
deux dans le sens de la longueur, sans retirer la
base t. Faites chauffer la moitié du beurre à
feu vif dans la même sauteuse tt. Mettez-y la
little gem, face tranchée vers le bas, baissez le
feu sur moyen, puis salez et poivrez. Faites cuire
2 minutes, couvrez, puis poursuivez la cuisson
7 à 10 minutes ou jusqu’à ce que la salade
commence à réduire.
ÉCRASER LA PURÉE
Pendant ce temps, à l’aide du presse-purée,
écrasez les pommes de terre avec le reste du
beurre, la moutarde, un filet de lait ainsi que du
sel et du poivre. Ciselez la ciboulette. Coupez le
filet mignon en tranches.
tCONSEIL : Si vous n’aimez pas la base de la
little gem, retirez-la juste avant de servir, mais
laissez-la pendant la cuisson !
SERVIR
Servez la purée de pommes de terre
et le filet mignon. Arrosez la viande avec la
marinade à l’orange. Présentez la little gem
étuvée à côté et parsemez-la de ciboulette.
ttCONSEIL : Si vous préparez ce plat pour
plus de 2 personnes, utilisez deux sauteuse`,
    },
  ],
};

const defaultConfig: LiveConnectConfig = {
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
  systemInstruction: systemInstruction,
};
// const defaultConfig: LiveConnectConfig = {
//   responseModalities: [Modality.AUDIO],
//   mediaResolution: MediaResolution.MEDIA_RESOLUTION_MEDIUM,
//   speechConfig: {
//     languageCode: "fr-FR",
//     voiceConfig: {
//       prebuiltVoiceConfig: {
//         voiceName: "Puck",
//       },
//     },
//   },
//   // contextWindowCompression: {
//   //   triggerTokens: "25600",
//   //   slidingWindow: { targetTokens: "12800" },
//   // },
//   systemInstruction: systemInstruction,
// };

export function useLiveAPI(options: LiveClientOptions): UseLiveAPIResults {
  const client = useMemo(() => new GenAILiveClient(options), [options]);
  const audioStreamerRef = useRef<AudioStreamer | null>(null);

  const [model, setModel] = useState<string>(
    // "models/gemini-2.5-flash-live-preview"
    "models/gemini-2.5-flash-preview-native-audio-dialog"
  );
  // const [model, setModel] = useState<string>("models/gemini-2.0-flash-exp");
  const [config, setConfig] = useState<LiveConnectConfig>(defaultConfig);
  const [connected, setConnected] = useState(false);
  const [volume, setVolume] = useState(0);

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

    const onClose = (e) => {
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
