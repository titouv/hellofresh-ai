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

  try {
    const cheerio = require("cheerio");
    const response = await fetch(url);
    const html = await response.text();

    const $ = cheerio.load(html);
    const nextData = $("#__NEXT_DATA__");
    const data = JSON.parse(nextData.text());
    const recipe: RecipeScraped = data.props.pageProps.ssrPayload.recipe;

    return NextResponse.json(recipe);
  } catch (error) {
    console.error("Error scraping recipe:", error);
    return NextResponse.json({ error: "Failed to scrape recipe" }, { status: 500 });
  }
}
