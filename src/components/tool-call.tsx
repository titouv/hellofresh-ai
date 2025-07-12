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
import { useEffect, useRef, useState, memo } from "react";
// import vegaEmbed from "vega-embed";
import {
  FunctionDeclaration,
  LiveConnectConfig,
  LiveServerToolCall,
  MediaResolution,
  Modality,
  Type,
} from "@google/genai";
import { useLiveAPIContext } from "@/contexts/live-api-context";
import { scrape } from "../../scrape";
import { RecipeScraped } from "../../recipe_types";

const declaration: FunctionDeclaration = {
  name: "render_step",
  description: "Displays the content of the step number n",
  parameters: {
    type: Type.OBJECT,
    properties: {
      step_number: {
        type: Type.NUMBER,
        description: "The step number to display",
      },
    },
    required: ["step_number"],
  },
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

function ToolCallComponent() {
  const [shownStep, setShownStep] = useState<
    RecipeScraped["steps"][number] | null
  >(null);
  const { client, setConfig, setModel } = useLiveAPIContext();

  useEffect(() => {
    const model = "models/gemini-2.0-flash-live-001";
    setModel(model);
    setConfig({
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
      tools: [
        // there is a free-tier quota for search
        { googleSearch: {} },
        { functionDeclarations: [declaration] },
      ],
    });
  }, [setConfig, setModel]);

  useEffect(() => {
    const onToolCall = async (toolCall: LiveServerToolCall) => {
      console.log("onToolCall", toolCall);
      if (!toolCall.functionCalls) {
        return;
      }
      console.log("toolCall.functionCalls", toolCall.functionCalls);
      const fc = toolCall.functionCalls.find(
        (fc) => fc.name === declaration.name
      );
      console.log("fc", fc);
      if (fc) {
        const str = (fc.args as any).step_number;
        const step = await getStepNumberContent(str);
        setShownStep(step);
      }
      console.log(
        "toolCall.functionCalls.length",
        toolCall.functionCalls.length
      );
      // send data for the response of your tool call
      // in this case Im just saying it was successful
      if (toolCall.functionCalls.length) {
        console.log("sending tool response");
        setTimeout(
          () =>
            client.sendToolResponse({
              functionResponses: toolCall.functionCalls?.map((fc) => ({
                response: { output: { success: true } },
                id: fc.id,
                name: fc.name,
              })),
            }),
          200
        );
      }
    };
    client.on("toolcall", onToolCall);
    return () => {
      client.off("toolcall", onToolCall);
    };
  }, [client]);

  const embedRef = useRef<HTMLDivElement>(null);

  const baseImageUrl =
    "https://img.hellofresh.com/w_384,q_auto,f_auto,c_limit,fl_lossy/hellofresh_s3/";

  if (!shownStep) {
    return null;
  }
  return (
    <div className="max-w-2xl mx-auto p-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg">
      <img
        src={baseImageUrl + shownStep?.images[0].link}
        alt="step"
        className="w-full h-64 object-cover rounded-lg mb-6"
      />
      <p className="text-lg text-gray-700 dark:text-gray-300 mb-4">
        {shownStep?.instructions}
      </p>
      <div
        className="prose dark:prose-invert max-w-none"
        dangerouslySetInnerHTML={{ __html: shownStep?.instructionsHTML || "" }}
      />
    </div>
  );
}

async function getStepNumberContent(stepNumber: number) {
  const urlToScrape = `/api/proxy?url=${encodeURIComponent(
    "https://www.hellofresh.fr/recipes/pilons-de-poulet-marines-et-grenailles-5cd56854729fc2001a1b4bf1"
  )}`;
  const recipe = await scrape(urlToScrape);
  const step = recipe.steps[stepNumber - 1];
  return step;
}

export const ToolCall = memo(ToolCallComponent);
