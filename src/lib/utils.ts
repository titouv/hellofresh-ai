// Fix from https://github.com/google-gemini/live-api-web-console/pull/22

export type GetAudioContextOptions = AudioContextOptions & {
  id?: string;
};

const map: Map<string, AudioContext> = new Map();
let interacted = false;

/**
 * Waits for a user interfaction and then resumes an audio context.
 * The web-browser prevents audio context from being used before user interaction
 * to stop web sites abusing auto play, or auto record.
 * @param audioCtx the audio context to unlock
 */
function unlockAudioContext(audioCtx: AudioContext) {
  if (audioCtx.state !== "suspended") {
    return;
  }
  if (interacted) {
    audioCtx.resume();
    return;
  }
  const events = [
    "touchstart",
    "touchend",
    "mousedown",
    "keydown",
    "pointerdown",
  ];
  events.forEach((e) => window.addEventListener(e, unlock, false));
  function unlock() {
    interacted = true;
    audioCtx.resume().then(clean);
  }
  function clean() {
    events.forEach((e) => window.removeEventListener(e, unlock));
  }
}

export async function audioContext(
  options?: GetAudioContextOptions
): Promise<AudioContext> {
  if (options?.id && map.has(options.id)) {
    const ctx = map.get(options.id);
    if (ctx) {
      unlockAudioContext(ctx);
      return ctx;
    }
  }
  const ctx = new AudioContext(options);
  if (options?.id) {
    map.set(options.id, ctx);
  }
  unlockAudioContext(ctx);
  return ctx;
}

export const blobToJSON = (blob: Blob) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (reader.result) {
        const json = JSON.parse(reader.result as string);
        resolve(json);
      } else {
        reject("oops");
      }
    };
    reader.readAsText(blob);
  });

export function base64ToArrayBuffer(base64: string) {
  var binaryString = atob(base64);
  var bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}
