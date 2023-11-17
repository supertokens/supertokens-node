// @ts-nocheck
import { RecipeInterface } from "./";
import { Querier } from "../../querier";
import type MultiFactorAuthRecipe from "./recipe";
import { TypeNormalisedInput } from "./types";
export default function getRecipeInterface(
    querier: Querier,
    config: TypeNormalisedInput,
    recipeInstance: MultiFactorAuthRecipe
): RecipeInterface;
