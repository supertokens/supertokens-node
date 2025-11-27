// @ts-nocheck
import {
    VerifySessionOptions,
    RecipeInterface,
    TokenTransferMethod,
    TypeNormalisedInput,
    SessionContainerInterface,
} from "./types";
import type SuperTokens from "../../supertokens";
import { ParsedJWTInfo } from "./jwt";
import { NormalisedAppinfo, UserContext } from "../../types";
import RecipeUserId from "../../recipeUserId";
import type SessionRecipe from "./recipe";
export declare function getSessionFromRequest({
    req,
    res,
    config,
    recipeInterfaceImpl,
    recipeInstance,
    stInstance,
    options,
    userContext,
}: {
    req: any;
    res: any;
    config: TypeNormalisedInput;
    recipeInterfaceImpl: RecipeInterface;
    recipeInstance: SessionRecipe;
    stInstance: SuperTokens;
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
    stInstance,
}: {
    res: any;
    req: any;
    userContext: UserContext;
    config: TypeNormalisedInput;
    recipeInterfaceImpl: RecipeInterface;
    stInstance: SuperTokens;
}): Promise<SessionContainerInterface>;
export declare function createNewSessionInRequest({
    req,
    res,
    userContext,
    recipeInstance,
    stInstance,
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
    recipeInstance: SessionRecipe;
    stInstance: SuperTokens;
    accessTokenPayload: any;
    userId: string;
    recipeUserId: RecipeUserId;
    config: TypeNormalisedInput;
    appInfo: NormalisedAppinfo;
    sessionDataInDatabase: any;
    tenantId: string;
}): Promise<SessionContainerInterface>;
