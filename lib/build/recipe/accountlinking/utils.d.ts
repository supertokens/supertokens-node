// @ts-nocheck
import RecipeUserId from "../../recipeUserId";
import type { NormalisedAppinfo } from "../../types";
import { User } from "../../user";
import type { TypeInput, TypeNormalisedInput } from "./types";
export declare function validateAndNormaliseUserInput(_: NormalisedAppinfo, config?: TypeInput): TypeNormalisedInput;
export declare function verifyEmailForRecipeUserIfLinkedAccountsAreVerified(input: {
    user: User;
    recipeUserId: RecipeUserId;
    userContext: any;
}): Promise<void>;
