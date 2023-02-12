// @ts-nocheck
import { RecipeInterface, TypeNormalisedInput } from "./types";
import { RecipeInterface as JWTRecipeInterface } from "../jwt/types";
export default function getRecipeInterface(
    config: TypeNormalisedInput,
    jwtRecipeImplementation: JWTRecipeInterface
): RecipeInterface;
