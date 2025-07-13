import { AuthToken } from "@google/genai";
import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";

export async function GET() {
  const client = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
  });
  const expireTime = new Date(Date.now() + 30 * 60 * 1000).toISOString();

  const token: AuthToken = await client.authTokens.create({
    config: {
      uses: 1, // The default
      expireTime: expireTime, // Default is 30 mins
      newSessionExpireTime: new Date(Date.now() + 1 * 60 * 1000).toISOString(), // Default 1 minute in the future
      httpOptions: { apiVersion: "v1alpha" },
    },
  });

  return NextResponse.json({ token });
}
