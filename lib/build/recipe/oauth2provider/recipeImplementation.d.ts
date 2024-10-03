// @ts-nocheck
import { Querier } from "../../querier";
import { NormalisedAppinfo } from "../../types";
import { RecipeInterface, TypeNormalisedInput, PayloadBuilderFunction, UserInfoBuilderFunction } from "./types";
export default function getRecipeInterface(
    querier: Querier,
    _config: TypeNormalisedInput,
    appInfo: NormalisedAppinfo,
    getDefaultAccessTokenPayload: PayloadBuilderFunction,
    getDefaultIdTokenPayload: PayloadBuilderFunction,
    getDefaultUserInfoPayload: UserInfoBuilderFunction
): RecipeInterface;
