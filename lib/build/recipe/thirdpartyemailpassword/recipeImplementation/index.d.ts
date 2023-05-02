// @ts-nocheck
import { RecipeInterface } from "../types";
import { Querier } from "../../../querier";
import { TypeNormalisedInput } from "../../emailpassword/types";
export default function getRecipeInterface(
    emailPasswordQuerier: Querier,
    thirdPartyQuerier?: Querier,
    getEmailPasswordConfig?: () => TypeNormalisedInput
): RecipeInterface;
