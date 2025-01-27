// @ts-nocheck
import { RecipeInterface, TypeNormalisedInput } from "./types";
import { Querier } from "../../querier";
import type AccountLinkingRecipe from "./recipe";
export default function getRecipeImplementation(
    querier: Querier,
    config: TypeNormalisedInput,
    recipeInstance: AccountLinkingRecipe
): RecipeInterface;
