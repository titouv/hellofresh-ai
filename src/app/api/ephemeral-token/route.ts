import OpenAI from "openai";
import { NextResponse } from "next/server";
import { REALTIME_MODEL } from "@/lib/realtime-config";

export async function GET() {
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      { error: "OPENAI_API_KEY is not configured" },
      { status: 500 },
    );
  }

  const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  const token = await client.realtime.clientSecrets.create({
    expires_after: {
      anchor: "created_at",
      seconds: 600,
    },
    session: {
      type: "realtime",
      model: REALTIME_MODEL,
      output_modalities: ["audio"],
      reasoning: {
        effort: "low",
      },
    },
  });

  return NextResponse.json({ token });
}
