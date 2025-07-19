import { RecipeScraped } from "./recipe_types";

import * as cheerio from "cheerio";

export const scrapeRecipe = async (url: string) => {
  const response = await fetch(url);
  const html = await response.text();

  const $ = cheerio.load(html);
  const nextData = $("#__NEXT_DATA__");
  const data = JSON.parse(nextData.text());
  const recipe: RecipeScraped = data.props.pageProps.ssrPayload.recipe;
  // console.dir(recipe, { depth: null });
  return recipe;
};

export interface RecipeSearchResult {
  id: string;
  name: string;
  slug: string;
  pdf: string;
  headline: string;
  image: string;
  label: string;
  tags: string[];
  url: string;
}

export async function searchRecipes(query: string) {
  const url = `https://hfresh.info/fr-fr?search=${encodeURIComponent(query)}`;
  const response = await fetch(url);
  const html = await response.text();

  const $ = cheerio.load(html);
  const appData = $("#app").data("page");
  const recipes = (appData as any).props.recipes.data.map((recipe: any) => {
    // const url = https://www.hellofresh.fr/recipes/risotto-aux-asperges-lardons-fumes-623ae65fbe82d3463e5704fc
    const url = `https://www.hellofresh.fr/recipes/${recipe.slug}-${recipe.id}`;
    return {
      id: recipe.id,
      name: recipe.name,
      slug: recipe.slug,
      pdf: recipe.pdf,
      headline: recipe.headline,
      image: recipe.image,
      label: recipe.label,
      tags: recipe.tags,
      url: url,
    };
  });

  return recipes as RecipeSearchResult[];
}

if (require.main === module) {
  searchRecipes("pilons de poulet").then((recipes) => {
    console.log(recipes);
  });
}
