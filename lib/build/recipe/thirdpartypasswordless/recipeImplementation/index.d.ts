// @ts-nocheck
import { RecipeInterface } from "../types";
import { Querier } from "../../../querier";
import { ProviderInput } from "../../thirdparty/types";
export default function getRecipeInterface(
    passwordlessQuerier: Querier,
    thirdPartyQuerier: Querier,
    providers?: ProviderInput[]
): RecipeInterface;
