// @ts-nocheck
import { BaseRequest, BaseResponse } from "../../framework";
import NormalisedURLPath from "../../normalisedURLPath";
import { HTTPMethod, NormalisedAppinfo } from "../../types";
import {
    EmailPasswordUser,
    PasswordlessUser,
    RecipeIdForUser,
    ThirdPartyUser,
    TypeInput,
    TypeNormalisedInput,
} from "./types";
export declare function validateAndNormaliseUserInput(config?: TypeInput): TypeNormalisedInput;
export declare function isApiPath(path: NormalisedURLPath, appInfo: NormalisedAppinfo): boolean;
export declare function getApiIdIfMatched(path: NormalisedURLPath, method: HTTPMethod): string | undefined;
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
export declare function validateApiKey(_: {
    req: BaseRequest;
    config: TypeNormalisedInput;
    userContext: any;
}): Promise<boolean>;
export declare function getApiPathWithDashboardBase(path: string): string;
