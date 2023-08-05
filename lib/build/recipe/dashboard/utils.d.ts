// @ts-nocheck
import type { BaseRequest, BaseResponse } from "../../framework";
import { RecipeIdForUser, TypeInput, TypeNormalisedInput, UserWithFirstAndLastName } from "./types";
import RecipeUserId from "../../recipeUserId";
export declare function validateAndNormaliseUserInput(config?: TypeInput): TypeNormalisedInput;
export declare function sendUnauthorisedAccess(res: BaseResponse): void;
export declare function isValidRecipeId(recipeId: string): recipeId is RecipeIdForUser;
export declare function getUserForRecipeId(
    recipeUserId: RecipeUserId,
    recipeId: string
): Promise<{
    user: UserWithFirstAndLastName | undefined;
    recipe:
        | "emailpassword"
        | "thirdparty"
        | "passwordless"
        | "thirdpartyemailpassword"
        | "thirdpartypasswordless"
        | undefined;
}>;
export declare function isRecipeInitialised(recipeId: RecipeIdForUser): boolean;
export declare function validateApiKey(input: {
    req: BaseRequest;
    config: TypeNormalisedInput;
    userContext: any;
}): Promise<boolean>;
export declare function getApiPathWithDashboardBase(path: string): string;
