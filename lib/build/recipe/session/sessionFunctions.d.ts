// @ts-nocheck
import { CreateOrRefreshAPIResponse, SessionInformation } from "./types";
import RecipeImplementation from "./recipeImplementation";
/**
 * @description call this to "login" a user.
 */
export declare function createNewSession(
    recipeImplementation: RecipeImplementation,
    userId: string,
    jwtPayload?: any,
    sessionData?: any
): Promise<CreateOrRefreshAPIResponse>;
/**
 * @description authenticates a session. To be used in APIs that require authentication
 */
export declare function getSession(
    recipeImplementation: RecipeImplementation,
    accessToken: string,
    antiCsrfToken: string | undefined,
    doAntiCsrfCheck: boolean,
    containsCustomHeader: boolean
): Promise<{
    session: {
        handle: string;
        userId: string;
        userDataInJWT: any;
    };
    accessToken?: {
        token: string;
        expiry: number;
        createdTime: number;
    };
}>;
/**
 * @description Retrieves session information from storage for a given session handle
 * @returns session data stored in the database, including userData and JWT payload
 */
export declare function getSessionInformation(
    recipeImplementation: RecipeImplementation,
    sessionHandle: string
): Promise<SessionInformation>;
/**
 * @description generates new access and refresh tokens for a given refresh token. Called when client's access token has expired.
 * @sideEffects calls onTokenTheftDetection if token theft is detected.
 */
export declare function refreshSession(
    recipeImplementation: RecipeImplementation,
    refreshToken: string,
    antiCsrfToken: string | undefined,
    containsCustomHeader: boolean
): Promise<CreateOrRefreshAPIResponse>;
/**
 * @description deletes session info of a user from db. This only invalidates the refresh token. Not the access token.
 * Access tokens cannot be immediately invalidated. Unless we add a blacklisting method. Or changed the private key to sign them.
 */
export declare function revokeAllSessionsForUser(
    recipeImplementation: RecipeImplementation,
    userId: string
): Promise<string[]>;
/**
 * @description gets all session handles for current user. Please do not call this unless this user is authenticated.
 */
export declare function getAllSessionHandlesForUser(
    recipeImplementation: RecipeImplementation,
    userId: string
): Promise<string[]>;
/**
 * @description call to destroy one session
 * @returns true if session was deleted from db. Else false in case there was nothing to delete
 */
export declare function revokeSession(
    recipeImplementation: RecipeImplementation,
    sessionHandle: string
): Promise<boolean>;
/**
 * @description call to destroy multiple sessions
 * @returns list of sessions revoked
 */
export declare function revokeMultipleSessions(
    recipeImplementation: RecipeImplementation,
    sessionHandles: string[]
): Promise<string[]>;
/**
 * @deprecated use getSessionInformation() instead
 * @description: this function reads from the database every time. It provides no locking mechanism in case other processes are updating session data for this session as well, so please take of that by yourself.
 * @returns session data as provided by the user earlier
 */
export declare function getSessionData(recipeImplementation: RecipeImplementation, sessionHandle: string): Promise<any>;
/**
 * @description: It provides no locking mechanism in case other processes are updating session data for this session as well.
 */
export declare function updateSessionData(
    recipeImplementation: RecipeImplementation,
    sessionHandle: string,
    newSessionData: any
): Promise<void>;
/**
 * @deprecated use getSessionInformation() instead
 * @returns jwt payload as provided by the user earlier
 */
export declare function getJWTPayload(recipeImplementation: RecipeImplementation, sessionHandle: string): Promise<any>;
export declare function updateJWTPayload(
    recipeImplementation: RecipeImplementation,
    sessionHandle: string,
    newJWTPayload: any
): Promise<void>;
