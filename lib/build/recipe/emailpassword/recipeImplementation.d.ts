// @ts-nocheck
import { RecipeInterface, TypeNormalisedInput } from "./types";
import { Querier } from "../../querier";
export default function getRecipeInterface(
    querier: Querier,
    getEmailPasswordConfig: () => TypeNormalisedInput
): RecipeInterface;
