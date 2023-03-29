// @ts-nocheck
import Recipe from "./recipe";
import { VerifySessionOptions, RecipeInterface, TypeNormalisedInput, SessionContainerInterface } from "./types";
import { NormalisedAppinfo } from "../../types";
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
    config,
    appInfo,
    sessionDataInDatabase,
    useDynamicAccessTokenSigningKey,
}: {
    req: any;
    res: any;
    userContext: any;
    recipeInstance: Recipe;
    accessTokenPayload: any;
    userId: string;
    config: TypeNormalisedInput;
    appInfo: NormalisedAppinfo;
    sessionDataInDatabase: any;
    useDynamicAccessTokenSigningKey: boolean | undefined;
}): Promise<SessionContainerInterface>;
