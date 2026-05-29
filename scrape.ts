import { RecipeScraped } from "./recipe_types";

import * as cheerio from "cheerio";

export const scrapeRecipe = async (url: string) => {
  const response = await fetch(url);
  const html = await response.text();

  const $ = cheerio.load(html);
  const nextData = $("#__NEXT_DATA__");
  const data = JSON.parse(nextData.text());
  const recipe: RecipeScraped = data.props.pageProps.ssrPayload.recipe;
  return recipe;
};
