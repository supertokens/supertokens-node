// @ts-nocheck
import { UserContext } from "../../../types";
import { SessionContainerInterface } from "../../session/types";
import { RecipeInterface } from "../types";
export declare function loginGET({
    recipeImplementation,
    loginChallenge,
    shouldTryRefresh,
    session,
    setCookie,
    isDirectCall,
    userContext,
}: {
    recipeImplementation: RecipeInterface;
    loginChallenge: string;
    session?: SessionContainerInterface;
    shouldTryRefresh: boolean;
    setCookie?: string;
    userContext: UserContext;
    isDirectCall: boolean;
}): Promise<{
    redirectTo: string;
    setCookie: string | undefined;
}>;
export declare function handleLoginInternalRedirects({
    response,
    recipeImplementation,
    session,
    shouldTryRefresh,
    cookie,
    userContext,
}: {
    response: {
        redirectTo: string;
        setCookie?: string;
    };
    recipeImplementation: RecipeInterface;
    session?: SessionContainerInterface;
    shouldTryRefresh: boolean;
    cookie?: string;
    userContext: UserContext;
}): Promise<{
    redirectTo: string;
    setCookie?: string;
}>;
export declare function handleLogoutInternalRedirects({
    response,
    recipeImplementation,
    session,
    userContext,
}: {
    response: {
        redirectTo: string;
    };
    recipeImplementation: RecipeInterface;
    session?: SessionContainerInterface;
    userContext: UserContext;
}): Promise<{
    redirectTo: string;
}>;
