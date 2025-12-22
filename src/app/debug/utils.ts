import TurndownService from "turndown";
import { RecipeScraped } from "../../../recipe_types";

function htmlToMarkdown(html: string) {
  const turndownService = new TurndownService();
  return turndownService.turndown(html);
}

function selectYieldForServingSize(
  recipe: RecipeScraped,
  servingSize?: number,
) {
  if (!recipe.yields || recipe.yields.length === 0) {
    return null;
  }

  const target = servingSize ?? recipe.servingSize;
  if (Number.isFinite(target)) {
    const exactMatch = recipe.yields.find((y) => y.yields === target);
    if (exactMatch) {
      return exactMatch;
    }

    return recipe.yields.reduce((closest, current) => {
      const closestDiff = Math.abs(closest.yields - target);
      const currentDiff = Math.abs(current.yields - target);
      return currentDiff < closestDiff ? current : closest;
    }, recipe.yields[0]);
  }

  return recipe.yields[0];
}

export function fullRecipeToMarkdown(
  recipe: RecipeScraped,
  servingSize?: number,
) {
  const allergensList = recipe.allergens
    .filter((a) => !a.tracesOf) // Filter out trace allergens
    .map((a) => a.name)
    .join(", ");

  const tracesAllergens = recipe.allergens
    .filter((a) => a.tracesOf)
    .map((a) => a.name)
    .join(", ");

  const yieldObject = selectYieldForServingSize(recipe, servingSize);
  const yieldIngredients = new Map(
    yieldObject?.ingredients.map((ingredient) => [ingredient.id, ingredient]),
  );

  return `
# ${recipe.name}

${recipe.description}

## Allergènes
${allergensList}

${tracesAllergens ? `Peut contenir des traces de : ${tracesAllergens}` : ""}

## Ingrédients
${recipe.ingredients
  .map((ingredient) => {
    const yieldIngredient = yieldIngredients.get(ingredient.id);
    const amount = yieldIngredient?.amount;
    const unit = yieldIngredient?.unit;

    if (amount === 0) return `- ${ingredient.name} ${unit}`;

    let displayAmount: string | undefined = amount?.toString();
    if (amount && amount < 5) {
      const wholeNumber = Math.floor(amount);
      const fractionalPart = amount - wholeNumber;

      let fractionString = "";

      // Convert decimal fraction to fraction string
      if (Math.abs(fractionalPart - 0.25) < 0.01) fractionString = "1/4";
      else if (Math.abs(fractionalPart - 0.33) < 0.01) fractionString = "1/3";
      else if (Math.abs(fractionalPart - 0.5) < 0.01) fractionString = "1/2";
      else if (Math.abs(fractionalPart - 0.66) < 0.01) fractionString = "2/3";
      else if (Math.abs(fractionalPart - 0.75) < 0.01) fractionString = "3/4";
      else if (fractionalPart > 0.01)
        fractionString = fractionalPart.toString();

      if (wholeNumber > 0 && fractionString) {
        displayAmount = `${wholeNumber} ${fractionString}`;
      } else if (wholeNumber > 0) {
        displayAmount = wholeNumber.toString();
      } else if (fractionString) {
        displayAmount = fractionString;
      }
    }

    return `- ${ingredient.name} ${displayAmount} ${unit}`;
  })
  .join("\n")}

## Instructions
${
  recipe.steps
    ?.map(
      (step, i) => `### Etape ${i + 1}\n${htmlToMarkdown(step.instructions)}`,
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
