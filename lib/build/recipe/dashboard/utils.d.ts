// @ts-nocheck
import { BaseRequest, BaseResponse } from "../../framework";
import {
    EmailPasswordUser,
    PasswordlessUser,
    RecipeIdForUser,
    ThirdPartyUser,
    TypeInput,
    TypeNormalisedInput,
} from "./types";
export declare function validateAndNormaliseUserInput(config?: TypeInput): TypeNormalisedInput;
export declare function sendUnauthorisedAccess(res: BaseResponse): void;
export declare function isValidRecipeId(recipeId: string): recipeId is RecipeIdForUser;
export declare function getUserForRecipeId(
    userId: string,
    recipeId: string
): Promise<{
    user: EmailPasswordUser | ThirdPartyUser | PasswordlessUser | undefined;
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
