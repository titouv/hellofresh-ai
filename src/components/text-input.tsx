import { useLiveAPIContext } from "@/contexts/live-api-context";
import { useState } from "react";

export function TextInput() {
  const { connected, client } = useLiveAPIContext();
  const [text, setText] = useState("");

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-200">
          Text Input
        </h1>
        <div className="flex gap-2">
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-200"
            placeholder="Type your message..."
          />
          <button
            onClick={() => {
              if (connected && client) {
                client.send([{ text: text }]);
              }
            }}
            className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={!connected || !client}
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
