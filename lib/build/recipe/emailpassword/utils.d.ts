import Recipe from "./recipe";
import { TypeInput, TypeNormalisedInput } from "./types";
import { NormalisedAppinfo } from "../../types";
export declare function validateAndNormaliseUserInput(recipeInstance: Recipe, appInfo: NormalisedAppinfo, config?: TypeInput): TypeNormalisedInput;
export declare function defaultPasswordValidator(value: string): Promise<"Password must contain at least 8 characters, including a number" | "Password's length must be lesser than 100 characters" | "Password must contain at least one alphabet" | "Password must contain at least one number" | undefined>;
export declare function defaultEmailValidator(value: string): Promise<"Email is invalid" | undefined>;
export declare function normaliseEmail(email: string): string;
