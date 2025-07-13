import { NextResponse } from "next/server";
import { RecipeScraped } from "../../../../recipe_types";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get("url");

  if (!url) {
    return NextResponse.json(
      { error: "URL parameter is required" },
      { status: 400 }
    );
  }

  const response = await fetch(url);
  const html = await response.text();

  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html",
    },
  });
}
