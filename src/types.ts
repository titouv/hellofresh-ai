/**
 * The options to initiate the realtime client with a browser-safe ephemeral key.
 */
export type LiveClientOptions = {
  apiKey: string;
  systemInstruction?: string;
};

/** log types */
export type StreamingLog = {
  date: Date;
  type: string;
  count?: number;
  message: string | Record<string, unknown> | unknown;
};

export type ClientContentLog = {
  turns: Array<{ text: string }>;
  turnComplete: boolean;
};
