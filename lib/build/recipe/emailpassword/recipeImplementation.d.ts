// @ts-nocheck
import { RecipeInterface, TypeNormalisedInput } from "./types";
import { Querier } from "../../querier";
import type SuperTokens from "../../supertokens";
export default function getRecipeInterface(
    stInstance: SuperTokens,
    querier: Querier,
    getEmailPasswordConfig: () => TypeNormalisedInput
): RecipeInterface;
