import { NextResponse } from "next/server";
import { searchRecipes } from "../../../../scrape";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("query");

  if (!query) {
    return NextResponse.json(
      { error: "Query parameter is required" },
      { status: 400 }
    );
  }

  try {
    const filteredRecipes = await searchRecipes(query);

    return NextResponse.json(filteredRecipes);
  } catch (error) {
    console.error("Error searching recipes:", error);
    return NextResponse.json(
      { error: "Failed to search recipes" },
      { status: 500 }
    );
  }
}
