// @ts-nocheck
import { UserContext } from "../../../types";
import { SessionContainerInterface } from "../../session/types";
import { RecipeInterface } from "../types";
export declare function loginGET({
    recipeImplementation,
    loginChallenge,
    session,
    setCookie,
    isDirectCall,
    userContext,
}: {
    recipeImplementation: RecipeInterface;
    loginChallenge: string;
    session?: SessionContainerInterface;
    setCookie?: string;
    userContext: UserContext;
    isDirectCall: boolean;
}): Promise<{
    redirectTo: string;
    setCookie: string | undefined;
}>;
export declare function logoutGET({
    logoutChallenge,
    recipeImplementation,
    session,
    userContext,
}: {
    logoutChallenge: string;
    recipeImplementation: RecipeInterface;
    session?: SessionContainerInterface;
    userContext: UserContext;
}): Promise<{
    redirectTo: string;
}>;
export declare function logoutPOST({
    logoutChallenge,
    session,
    recipeImplementation,
    userContext,
}: {
    logoutChallenge: string;
    recipeImplementation: RecipeInterface;
    session?: SessionContainerInterface;
    userContext: UserContext;
}): Promise<{
    redirectTo: string;
}>;
export declare function handleInternalRedirects({
    response,
    recipeImplementation,
    session,
    cookie,
    userContext,
}: {
    response: {
        redirectTo: string;
        setCookie?: string;
    };
    recipeImplementation: RecipeInterface;
    session?: SessionContainerInterface;
    cookie?: string;
    userContext: UserContext;
}): Promise<{
    redirectTo: string;
    setCookie?: string;
}>;
