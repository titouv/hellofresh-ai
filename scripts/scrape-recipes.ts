import * as cheerio from "cheerio";
import type { RecipeSearchResult } from "../src/lib/api/types";

async function getRecipePageData(page: number) {
  const cachePath = `./.cache/recipes/page-${page}.json`;

  if (fs.existsSync(cachePath)) {
    return JSON.parse(fs.readFileSync(cachePath, "utf8"));
  }

  const url = `https://hfresh.info/fr-fr?page=${page}`;
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

  fs.writeFileSync(cachePath, JSON.stringify(recipes, null, 2));

  return recipes as RecipeSearchResult[];
}

async function getAllRecipes() {
  const recipes: RecipeSearchResult[] = [];
  for (let i = 1; i <= 1_000; i++) {
    console.log(`Getting page ${i}`);
    const recipesPage = await getRecipePageData(i);
    console.log(`Found ${recipesPage.length} recipes on page ${i}`);
    if (recipesPage.length === 0) {
      break;
    }
    recipes.push(...recipesPage);
    // await new Promise((resolve) => setTimeout(resolve, 500));
  }
  return recipes;
}

import fs from "fs";
async function main() {
  const recipes = await getAllRecipes();
  console.log(`Found ${recipes.length} recipes`);
  fs.writeFileSync("recipes.json", JSON.stringify(recipes, null, 2));
}

main();
