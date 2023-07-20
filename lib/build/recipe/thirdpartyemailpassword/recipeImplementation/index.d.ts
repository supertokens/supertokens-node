// @ts-nocheck
import { RecipeInterface } from "../types";
import { Querier } from "../../../querier";
import { TypeNormalisedInput } from "../../emailpassword/types";
import { ProviderInput } from "../../thirdparty/types";
export default function getRecipeInterface(
    emailPasswordQuerier: Querier,
    getEmailPasswordConfig: () => TypeNormalisedInput,
    thirdPartyQuerier: Querier,
    providers?: ProviderInput[]
): RecipeInterface;
