// @ts-nocheck
import RecipeUserId from "../../recipeUserId";
import type { NormalisedAppinfo, UserContext } from "../../types";
import { User } from "../../user";
import type { TypeInput, TypeNormalisedInput } from "./types";
export declare function validateAndNormaliseUserInput(_: NormalisedAppinfo, config?: TypeInput): TypeNormalisedInput;
export declare function verifyEmailForRecipeUserIfLinkedAccountsAreVerified(input: {
    user: User;
    recipeUserId: RecipeUserId;
    userContext: UserContext;
}): Promise<void>;
