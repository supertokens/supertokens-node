// @ts-nocheck
import { UserContext } from "../../../types";
import { SessionContainerInterface } from "../../session/types";
import { ErrorOAuth2, RecipeInterface } from "../types";
export declare function loginGET({
    recipeImplementation,
    loginChallenge,
    shouldTryRefresh,
    session,
    cookies,
    isDirectCall,
    userContext,
}: {
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
    response,
    recipeImplementation,
    session,
    shouldTryRefresh,
    cookie,
    userContext,
}: {
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
}): Promise<
    | {
          redirectTo: string;
      }
    | ErrorOAuth2
>;
