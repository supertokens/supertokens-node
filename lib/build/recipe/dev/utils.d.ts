// @ts-nocheck
import { ThirdPartyRecipeModule, TypeInput } from "./types";
import Recipe from "./recipe";
import { TypeNormalisedInput } from "./types";
export declare function validateAndNormaliseUserInput(_: Recipe, config: TypeInput): TypeNormalisedInput;
export declare function isUsingDevelopmentClientId(recipeModules: ThirdPartyRecipeModule[]): Promise<boolean>;
