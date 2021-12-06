// @ts-nocheck
import { RecipeInterface } from "../";
import { NormalisedAppinfo } from "../../../types";
import { RecipeInterface as OpenIdRecipeInterface } from "../../openid/types";
import { TypeNormalisedInput } from "../types";
export declare function setJWTExpiryOffsetSecondsForTesting(offset: number): void;
export default function (
    originalImplementation: RecipeInterface,
    openIdRecipeImplementation: OpenIdRecipeInterface,
    config: TypeNormalisedInput,
    appInfo: NormalisedAppinfo
): RecipeInterface;
