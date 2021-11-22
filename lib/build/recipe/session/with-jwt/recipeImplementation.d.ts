// @ts-nocheck
import { RecipeInterface } from "../";
import { RecipeInterface as JWTRecipeInterface } from "../../jwt/types";
import { TypeNormalisedInput } from "../types";
export default function (
    originalImplementation: RecipeInterface,
    jwtRecipeImplementation: JWTRecipeInterface,
    config: TypeNormalisedInput
): RecipeInterface;
