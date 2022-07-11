// @ts-nocheck
import { Querier } from "../../querier";
import { NormalisedAppinfo } from "../../types";
import { RecipeInterface, TypeNormalisedInput } from "./types";
export default function getRecipeInterface(
    querier: Querier,
    config: TypeNormalisedInput,
    appInfo: NormalisedAppinfo
): RecipeInterface;
