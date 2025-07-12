import { useLiveAPIContext } from "@/contexts/live-api-context";
import { useState } from "react";

export function TextInput() {
  const { connected, client } = useLiveAPIContext();
  const [text, setText] = useState("");

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <div className="bg-white rounded-2xl shadow-lg border border-green-100 p-6">
        <div className="flex flex-col gap-4">
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <span className="w-3 h-3 bg-green-500 rounded-full"></span>
            Text Input
          </h1>
          <div className="flex gap-3">
            <input
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="flex-1 px-4 py-3 border border-green-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent bg-green-50/50 text-gray-900 placeholder-gray-500 transition-all"
              placeholder="Type your message..."
            />
            <button
              onClick={() => {
                if (connected && client) {
                  client.send([{ text: text }]);
                }
              }}
              className="px-6 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium shadow-sm hover:shadow-md"
              disabled={!connected || !client}
            >
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
