import { searchRecipesServerFn } from "./src/server_functions";

console.time("search");
const result = await searchRecipesServerFn("Crocburger jambon fromage tomates");
console.timeEnd("search");

// console.log(result);
