// @ts-nocheck
import type SuperTokens from "../../../supertokens";
import { UserContext } from "../../../types";
import { SessionContainerInterface } from "../../session/types";
import { ErrorOAuth2, RecipeInterface } from "../types";
export declare function loginGET({
    stInstance,
    recipeImplementation,
    loginChallenge,
    shouldTryRefresh,
    session,
    cookies,
    isDirectCall,
    userContext,
}: {
    stInstance: SuperTokens;
    recipeImplementation: RecipeInterface;
    loginChallenge: string;
    session?: SessionContainerInterface;
    shouldTryRefresh: boolean;
    cookies?: string[];
    userContext: UserContext;
    isDirectCall: boolean;
}): Promise<
    | ErrorOAuth2
    | {
          status: string;
          redirectTo: string;
          cookies: string[] | undefined;
      }
    | {
          redirectTo: string;
          cookies: string[] | undefined;
          status?: undefined;
      }
>;
export declare function handleLoginInternalRedirects({
    stInstance,
    response,
    recipeImplementation,
    session,
    shouldTryRefresh,
    cookie,
    userContext,
}: {
    stInstance: SuperTokens;
    response: {
        redirectTo: string;
        cookies?: string[];
    };
    recipeImplementation: RecipeInterface;
    session?: SessionContainerInterface;
    shouldTryRefresh: boolean;
    cookie?: string;
    userContext: UserContext;
}): Promise<
    | {
          redirectTo: string;
          cookies?: string[];
      }
    | ErrorOAuth2
>;
export declare function handleLogoutInternalRedirects({
    stInstance,
    response,
    recipeImplementation,
    session,
    userContext,
}: {
    stInstance: SuperTokens;
    response: {
        redirectTo: string;
    };
    recipeImplementation: RecipeInterface;
    session?: SessionContainerInterface;
    userContext: UserContext;
}): Promise<
    | {
          redirectTo: string;
      }
    | ErrorOAuth2
>;
