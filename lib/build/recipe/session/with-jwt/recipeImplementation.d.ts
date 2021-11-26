// @ts-nocheck
import { RecipeInterface } from "../";
import { NormalisedAppinfo } from "../../../types";
import { RecipeInterface as JWTRecipeInterface } from "../../jwt/types";
import { TypeNormalisedInput } from "../types";
export declare function setJWTExpiryOffsetSecondsForTesting(offset: number): void;
export default function (
    originalImplementation: RecipeInterface,
    jwtRecipeImplementation: JWTRecipeInterface,
    config: TypeNormalisedInput,
    appInfo: NormalisedAppinfo
): RecipeInterface;
