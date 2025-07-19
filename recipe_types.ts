export interface RecipeScraped {
  active: boolean;
  allergens: Allergen[];
  averageRating: number;
  canonical: string;
  clonedFrom: string;
  country: string;
  createdAt: string;
  cuisines: any[];
  description: string;
  descriptionHTML: string;
  descriptionMarkdown: string;
  difficulty: number;
  favoritesCount: number;
  headline: string;
  imagePath: string;
  ingredients: WelcomeIngredient[];
  isAddon: boolean;
  isPublished: boolean;
  label: Label[];
  languageCode: string;
  name: string;
  nutrition: Nutrition[];
  prepTime: string;
  ratingsCount: number;
  recipeId: string;
  seoDescription: string;
  seoName: string;
  servingSize: number;
  slug: string;
  steps: Step[];
  tags: Tag[];
  totalTime: string;
  uniqueRecipeCode: string | null;
  utensils: Utensil[];
  uuid: null;
  yields: Yield[];
  allergensNew: Allergen[];
  id: string;
  recipeCollections: any[];
  websiteUrl: string;
  canonicalLink: string;
}

export interface Allergen {
  id: string;
  type: string;
  name: string;
  slug: string;
  triggersTracesOf?: boolean | null;
  tracesOf?: boolean | null;
  iconPath?: string | null;
  iconLink?: string | null;
}

export interface WelcomeIngredient {
  id: string;
  uuid: string;
  type: string;
  name: string;
  slug: string;
  imagePath: string;
  shipped: boolean;
  familyId?: string;
  allergens: Allergen[];
}

export interface Label {
  type: string;
  name: string;
  foregroundColor: string;
  backgroundColor: string;
  showToCustomer: boolean;
  id: string;
}

export interface Nutrition {
  id: string;
  name: string;
  unit: string;
  amount: number;
  type: string;
}

export interface Step {
  id: string;
  index: number;
  instructions: string;
  instructionsHTML: string;
  instructionsMarkdown: string;
  images: Image[];
  videos: any[];
}

export interface Image {
  id: string;
  link: string;
  path: string;
  caption: string;
}

export interface Tag {
  id: string;
  name: string;
  type: string;
  slug: string;
  colorHandle: null | string;
  preferences: string[] | null;
  displayLabel: boolean | null;
}

export interface Utensil {
  id: string;
  type: string;
  name: string;
}

export interface Yield {
  id: string;
  yields: number;
  ingredients: YieldIngredient[];
}

export interface YieldIngredient {
  id: string;
  amount: number;
  unit: string;
}
