import { RecipeScraped } from "./recipe_types";

const cheerio = require("cheerio");

const urlToScrape =
  "https://www.hellofresh.fr/recipes/pilons-de-poulet-marines-et-grenailles-5cd56854729fc2001a1b4bf1";

export const scrape = async (url: string) => {
  const response = await fetch(url);
  const html = await response.text();

  const $ = cheerio.load(html);
  const nextData = $("#__NEXT_DATA__");
  const data = JSON.parse(nextData.text());
  const recipe: RecipeScraped = data.props.pageProps.ssrPayload.recipe;
  console.dir(recipe, { depth: null });
  return recipe;
};
