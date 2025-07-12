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
import {
  FunctionDeclaration,
  LiveConnectConfig,
  LiveServerToolCall,
  MediaResolution,
  Modality,
  Type,
} from "@google/genai";
import { useLiveAPIContext } from "@/contexts/live-api-context";
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
export const toolsForConfig = [
  { googleSearch: {} },
  { functionDeclarations: [declaration] },
];

function ToolCallComponent({ recipe }: { recipe: RecipeScraped | null }) {
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
      tools: [{ googleSearch: {} }, { functionDeclarations: [declaration] }],
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
      if (fc && recipe) {
        const stepNumber = (fc.args as any).step_number;
        const step = recipe.steps[stepNumber - 1];
        setShownStep(step);
      }
      console.log(
        "toolCall.functionCalls.length",
        toolCall.functionCalls.length
      );
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
  }, [client, recipe]);

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
      <div
        className="prose dark:prose-invert max-w-none"
        dangerouslySetInnerHTML={{ __html: shownStep?.instructionsHTML || "" }}
      />
    </div>
  );
}

export const ToolCall = memo(ToolCallComponent);
