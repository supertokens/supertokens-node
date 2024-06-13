// @ts-nocheck
import { RecipeInterface, TypeNormalisedInput } from "./types";
import { RecipeInterface as JWTRecipeInterface } from "../jwt/types";
import { NormalisedAppinfo } from "../../types";
export default function getRecipeInterface(
    config: TypeNormalisedInput,
    jwtRecipeImplementation: JWTRecipeInterface,
    appInfo: NormalisedAppinfo
): RecipeInterface;
