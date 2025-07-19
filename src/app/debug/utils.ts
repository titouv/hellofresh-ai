import TurndownService from "turndown";
import { RecipeScraped } from "../../../recipe_types";

function htmlToMarkdown(html: string) {
  const turndownService = new TurndownService();
  return turndownService.turndown(html);
}

const HARCODED_NUMBER_OF_PERSON = 4;

export function fullRecipeToMarkdown(recipe: RecipeScraped) {
  const allergensList = recipe.allergens
    .filter((a) => !a.tracesOf) // Filter out trace allergens
    .map((a) => a.name)
    .join(", ");

  const tracesAllergens = recipe.allergens
    .filter((a) => a.tracesOf)
    .map((a) => a.name)
    .join(", ");

  const yieldObject = recipe.yields[HARCODED_NUMBER_OF_PERSON];

  return `
# ${recipe.name}

${recipe.description}

## Allergènes
${allergensList}

${tracesAllergens ? `Peut contenir des traces de : ${tracesAllergens}` : ""}

## Ingrédients
${recipe.ingredients
  .map(
    (ingredient) =>
      `- ${ingredient.name} ${
        yieldObject.ingredients.find((i) => i.id === ingredient.id)?.amount
      } ${yieldObject.ingredients.find((i) => i.id === ingredient.id)?.unit}`
  )
  .join("\n")}

## Instructions
${
  recipe.steps
    ?.map(
      (step, i) => `### Etape ${i + 1}\n${htmlToMarkdown(step.instructions)}`
    )
    .join("\n\n") || ""
}

## Valeurs nutritionnelles
${
  recipe.nutrition
    ?.map((n) => `- ${n.name}: ${n.amount}${n.unit}`)
    .join("\n") || ""
}
`;
}
