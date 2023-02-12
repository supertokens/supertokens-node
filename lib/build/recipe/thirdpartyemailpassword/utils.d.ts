// @ts-nocheck
import { NormalisedAppinfo } from "../../types";
import { TypeInput, TypeNormalisedInput } from "./types";
import Recipe from "./recipe";
export declare function validateAndNormaliseUserInput(
    recipeInstance: Recipe,
    appInfo: NormalisedAppinfo,
    config?: TypeInput
): TypeNormalisedInput;
