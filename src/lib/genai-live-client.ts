import { EventEmitter } from "eventemitter3";
import {
  FunctionTool,
  RealtimeAgent,
  RealtimeSession,
  RealtimeSessionConfig,
  TransportLayerAudio,
} from "@openai/agents/realtime";
import { base64ToArrayBuffer } from "./utils";
import { LiveClientOptions, StreamingLog } from "../types";

type LiveFunctionTool = FunctionTool<any, any, any>;

/**
 * Event types emitted by the OpenAI realtime client wrapper.
 */
export interface LiveClientEventTypes {
  // Emitted when audio data is received by transports that expose audio manually.
  audio: (data: ArrayBuffer) => void;
  // Emitted when the connection closes
  close: (event?: CloseEvent) => void;
  // Emitted when content/history is received from the server
  content: (data: unknown) => void;
  // Emitted when an error occurs
  error: (error: unknown) => void;
  // Emitted when the server interrupts the current generation
  interrupted: () => void;
  // Emitted for logging events
  log: (log: StreamingLog) => void;
  // Emitted when the connection opens
  open: () => void;
  // Emitted when the initial setup is complete
  setupcomplete: () => void;
  // Kept for backwards compatibility; OpenAI tool execution is handled by SDK tools.
  toolcall: (toolCall: unknown) => void;
  toolcallcancellation: (toolcallCancellation: unknown) => void;
  // Emitted when the current turn is complete
  turncomplete: () => void;
}

/**
 * Event-emitting wrapper around the OpenAI Agents SDK realtime session.
 */
export class GenAILiveClient extends EventEmitter<LiveClientEventTypes> {
  private _status: "connected" | "disconnected" | "connecting" = "disconnected";
  public get status() {
    return this._status;
  }

  private _session: RealtimeSession | null = null;
  public get session() {
    return this._session;
  }

  private _model: string | null = null;
  public get model() {
    return this._model;
  }

  private _tools: LiveFunctionTool[] = [];
  private _systemInstruction = "";
  protected config: Partial<RealtimeSessionConfig> | null = null;

  public getConfig() {
    return { ...this.config };
  }

  constructor(options: LiveClientOptions) {
    super();
    this._systemInstruction = options.systemInstruction || "";
  }

  protected log(type: string, message: StreamingLog["message"]) {
    const log: StreamingLog = {
      date: new Date(),
      type,
      message,
    };
    this.emit("log", log);
  }

  setTools(tools: LiveFunctionTool[]) {
    this._tools = tools;
    if (this.session) {
      this.session.updateAgent(this.createAgent()).catch((error) => {
        this.log("client.updateAgent.error", error);
        this.emit("error", error);
      });
    }
  }

  private createAgent() {
    return new RealtimeAgent({
      name: "HelloFresh cooking assistant",
      instructions: this._systemInstruction,
      tools: this._tools,
      voice: "ash",
    });
  }

  private createSession(model: string, config: Partial<RealtimeSessionConfig>) {
    const session = new RealtimeSession(this.createAgent(), {
      model,
      config,
      transport: "webrtc",
      tracingDisabled: false,
    });

    session.on("audio", (event: TransportLayerAudio) => {
      this.emit("audio", event.data);
      this.log("server.audio", `buffer (${event.data.byteLength})`);
    });
    session.on("audio_interrupted", () => {
      this.log("server.content", "interrupted");
      this.emit("interrupted");
    });
    session.on("agent_tool_start", (_context, _agent, tool, details) => {
      this.log("server.toolCall", {
        name: tool.name,
        callId: details.toolCall.id,
      });
      this.emit("toolcall", details.toolCall);
    });
    session.on("audio_stopped", () => {
      this.log("server.content", "turnComplete");
      this.emit("turncomplete");
    });
    session.on("history_updated", (history) => {
      this.emit("content", { history });
      this.log("server.history", { historyLength: history.length });
    });
    session.on("error", (event) => {
      this.log("server.error", event);
      this.emit("error", event.error);
    });

    return session;
  }

  async connect(
    model: string,
    config: Partial<RealtimeSessionConfig>,
    apiKey: string
  ): Promise<boolean> {
    if (this._status === "connected" || this._status === "connecting") {
      return false;
    }

    this._status = "connecting";
    this.config = config;
    this._model = model;

    try {
      this._session = this.createSession(model, config);
      await this._session.connect({ apiKey });
    } catch (e) {
      console.error("Error connecting to OpenAI Realtime:", e);
      this._status = "disconnected";
      this.emit("error", e);
      return false;
    }

    this._status = "connected";
    this.log("client.open", "Connected");
    this.emit("open");
    this.emit("setupcomplete");
    return true;
  }

  public disconnect() {
    if (!this.session) {
      return false;
    }
    this.session.close();
    this._session = null;
    this._status = "disconnected";

    this.log("client.close", `Disconnected`);
    this.emit("close");
    return true;
  }

  /**
   * Send realtime input. WebRTC manages microphone input by default, but this
   * remains available for components that manually provide PCM chunks.
   */
  sendRealtimeInput(chunks: Array<{ mimeType: string; data: string }>) {
    let hasAudio = false;
    let hasVideo = false;
    for (const ch of chunks) {
      if (ch.mimeType.includes("audio")) {
        this.session?.sendAudio(base64ToArrayBuffer(ch.data));
        hasAudio = true;
      }
      if (ch.mimeType.includes("image")) {
        this.session?.addImage(`data:${ch.mimeType};base64,${ch.data}`);
        hasVideo = true;
      }
      if (hasAudio && hasVideo) {
        break;
      }
    }
    const message =
      hasAudio && hasVideo
        ? "audio + video"
        : hasAudio
        ? "audio"
        : hasVideo
        ? "video"
        : "unknown";
    this.log(`client.realtimeInput`, message);
  }

  sendToolResponse(toolResponse: unknown) {
    this.log(`client.toolResponse.ignored`, toolResponse);
  }

  /**
   * send normal content parts such as { text }
   */
  send(parts: { text: string } | Array<{ text: string }>, turnComplete = true) {
    const messages = Array.isArray(parts) ? parts : [parts];
    messages.forEach((part) => this.session?.sendMessage(part.text));
    this.log(`client.send`, {
      turns: messages,
      turnComplete,
    });
  }

  mute(muted: boolean) {
    this.session?.mute(muted);
  }
}
