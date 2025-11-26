// @ts-nocheck
import { Querier } from "../../querier";
import { NormalisedAppinfo } from "../../types";
import { RecipeInterface, TypeNormalisedInput, PayloadBuilderFunction, UserInfoBuilderFunction } from "./types";
import type SuperTokens from "../../supertokens";
export default function getRecipeInterface(
    stInstance: SuperTokens,
    querier: Querier,
    _config: TypeNormalisedInput,
    appInfo: NormalisedAppinfo,
    getDefaultAccessTokenPayload: PayloadBuilderFunction,
    getDefaultIdTokenPayload: PayloadBuilderFunction,
    getDefaultUserInfoPayload: UserInfoBuilderFunction
): RecipeInterface;
