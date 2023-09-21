// @ts-nocheck
import Recipe from "./recipe";
import { VerifySessionOptions, RecipeInterface, TypeNormalisedInput, SessionContainerInterface } from "./types";
import { NormalisedAppinfo } from "../../types";
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
    userContext?: any;
}): Promise<SessionContainerInterface | undefined>;
export declare function refreshSessionInRequest({
    res,
    req,
    userContext,
    config,
    recipeInterfaceImpl,
}: {
    res: any;
    req: any;
    userContext: any;
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
    userContext: any;
    recipeInstance: Recipe;
    accessTokenPayload: any;
    userId: string;
    recipeUserId: RecipeUserId;
    config: TypeNormalisedInput;
    appInfo: NormalisedAppinfo;
    sessionDataInDatabase: any;
    tenantId: string;
}): Promise<SessionContainerInterface>;
