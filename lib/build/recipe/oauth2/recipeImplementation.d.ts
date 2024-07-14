// @ts-nocheck
import { Querier } from "../../querier";
import { NormalisedAppinfo } from "../../types";
import { RecipeInterface, TypeNormalisedInput, PayloadBuilderFunction } from "./types";
export default function getRecipeInterface(
    querier: Querier,
    _config: TypeNormalisedInput,
    _appInfo: NormalisedAppinfo,
    getDefaultIdTokenPayload: PayloadBuilderFunction
): RecipeInterface;
