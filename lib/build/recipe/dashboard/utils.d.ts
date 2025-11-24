// @ts-nocheck
import type { BaseRequest, BaseResponse } from "../../framework";
import { RecipeIdForUser, TypeInput, TypeNormalisedInput, UserWithFirstAndLastName } from "./types";
import RecipeUserId from "../../recipeUserId";
import { UserContext } from "../../types";
export declare function validateAndNormaliseUserInput(config?: TypeInput): TypeNormalisedInput;
export declare function sendUnauthorisedAccess(res: BaseResponse): void;
export declare function isValidRecipeId(recipeId: string): recipeId is RecipeIdForUser;
export declare function getUserForRecipeId(
    recipeUserId: RecipeUserId,
    recipeId: string,
    userContext: UserContext
): Promise<{
    user: UserWithFirstAndLastName | undefined;
    recipe: "emailpassword" | "thirdparty" | "passwordless" | "webauthn" | undefined;
}>;
export declare function validateApiKey(input: {
    req: BaseRequest;
    config: TypeNormalisedInput;
    userContext: UserContext;
}): Promise<boolean>;
export declare function getApiPathWithDashboardBase(path: string): string;
