// @ts-nocheck
import { RecipeInterface, ProviderInput } from "./types";
import { Querier } from "../../querier";
import type SuperTokens from "../../supertokens";
export default function getRecipeImplementation(
    stInstance: SuperTokens,
    querier: Querier,
    providers: ProviderInput[]
): RecipeInterface;
