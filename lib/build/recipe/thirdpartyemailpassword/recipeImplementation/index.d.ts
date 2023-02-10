// @ts-nocheck
import { RecipeInterface } from "../types";
import { Querier } from "../../../querier";
import { ProviderInput } from "../../thirdparty/types";
export default function getRecipeInterface(
    emailPasswordQuerier: Querier,
    thirdPartyQuerier?: Querier,
    providers?: ProviderInput[]
): RecipeInterface;
