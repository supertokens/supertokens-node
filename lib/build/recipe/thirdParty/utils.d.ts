import { NormalisedAppinfo } from "../../types";
import Recipe from "./recipe";
import { TypeInput, TypeNormalisedInput } from "./types";
export declare function validateAndNormaliseUserInput(recipeInstance: Recipe, appInfo: NormalisedAppinfo, config: TypeInput): TypeNormalisedInput;
export declare function getRedirectionURI(recipeInstance: Recipe, provider: string): string;
