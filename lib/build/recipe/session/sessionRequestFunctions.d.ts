// @ts-nocheck
import Recipe from "./recipe";
import {
    VerifySessionOptions,
    RecipeInterface,
    TokenTransferMethod,
    TypeNormalisedInput,
    SessionContainerInterface,
} from "./types";
import { ParsedJWTInfo } from "./jwt";
import { NormalisedAppinfo, UserContext } from "../../types";
import RecipeUserId from "../../recipeUserId";
export declare function getSessionFromRequest({
    req,
    res,
    config,
    recipeInterfaceImpl,
    options,
    userContext,
}: {
    req: any;
    res: any;
    config: TypeNormalisedInput;
    recipeInterfaceImpl: RecipeInterface;
    options?: VerifySessionOptions;
    userContext: UserContext;
}): Promise<SessionContainerInterface | undefined>;
export declare function getAccessTokenFromRequest(
    config: TypeNormalisedInput,
    req: any,
    allowedTransferMethod: TokenTransferMethod | "any",
    userContext: UserContext
): {
    requestTransferMethod: TokenTransferMethod | undefined;
    accessToken: ParsedJWTInfo | undefined;
    allowedTransferMethod: TokenTransferMethod | "any";
};
export declare function refreshSessionInRequest({
    res,
    req,
    userContext,
    config,
    recipeInterfaceImpl,
}: {
    res: any;
    req: any;
    userContext: UserContext;
    config: TypeNormalisedInput;
    recipeInterfaceImpl: RecipeInterface;
}): Promise<SessionContainerInterface>;
export declare function createNewSessionInRequest({
    req,
    res,
    userContext,
    recipeInstance,
    accessTokenPayload,
    userId,
    recipeUserId,
    config,
    appInfo,
    sessionDataInDatabase,
    tenantId,
}: {
    req: any;
    res: any;
    userContext: UserContext;
    recipeInstance: Recipe;
    accessTokenPayload: any;
    userId: string;
    recipeUserId: RecipeUserId;
    config: TypeNormalisedInput;
    appInfo: NormalisedAppinfo;
    sessionDataInDatabase: any;
    tenantId: string;
}): Promise<SessionContainerInterface>;
