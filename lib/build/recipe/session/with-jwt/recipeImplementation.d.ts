// @ts-nocheck
import { RecipeInterface } from "../";
import { RecipeInterface as OpenIdRecipeInterface } from "../../openid/types";
import { TypeNormalisedInput } from "../types";
export declare function setJWTExpiryOffsetSecondsForTesting(offset: number): void;
export default function (
    originalImplementation: RecipeInterface,
    openIdRecipeImplementation: OpenIdRecipeInterface,
    config: TypeNormalisedInput
): RecipeInterface;
