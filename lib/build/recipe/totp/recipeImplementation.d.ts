// @ts-nocheck
import { RecipeInterface } from "./";
import { Querier } from "../../querier";
import { TypeNormalisedInput } from "./types";
import SuperTokens from "../../supertokens";
export default function getRecipeInterface(
    stInstance: SuperTokens,
    querier: Querier,
    config: TypeNormalisedInput
): RecipeInterface;
