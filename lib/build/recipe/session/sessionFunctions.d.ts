import { CreateOrRefreshAPIResponse } from "./types";
import SessionRecipe from "./sessionRecipe";
/**
 * @description call this to "login" a user.
 * @throws GENERAL_ERROR in case anything fails.
 */
export declare function createNewSession(recipeInstance: SessionRecipe, userId: string, jwtPayload?: any, sessionData?: any): Promise<CreateOrRefreshAPIResponse>;
/**
 * @description authenticates a session. To be used in APIs that require authentication
 * @throws AuthError, GENERAL_ERROR, UNAUTHORISED and TRY_REFRESH_TOKEN
 */
export declare function getSession(recipeInstance: SessionRecipe, accessToken: string, antiCsrfToken: string | undefined, doAntiCsrfCheck: boolean, containsCustomHeader: boolean): Promise<{
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
 * @description generates new access and refresh tokens for a given refresh token. Called when client's access token has expired.
 * @sideEffects calls onTokenTheftDetection if token theft is detected.
 * @throws AuthError, GENERAL_ERROR, UNAUTHORISED, TOKEN_THEFT_DETECTED
 */
export declare function refreshSession(recipeInstance: SessionRecipe, refreshToken: string, antiCsrfToken: string | undefined, containsCustomHeader: boolean): Promise<CreateOrRefreshAPIResponse>;
/**
 * @description deletes session info of a user from db. This only invalidates the refresh token. Not the access token.
 * Access tokens cannot be immediately invalidated. Unless we add a blacklisting method. Or changed the private key to sign them.
 * @throws AuthError, GENERAL_ERROR
 */
export declare function revokeAllSessionsForUser(recipeInstance: SessionRecipe, userId: string): Promise<string[]>;
/**
 * @description gets all session handles for current user. Please do not call this unless this user is authenticated.
 * @throws AuthError, GENERAL_ERROR
 */
export declare function getAllSessionHandlesForUser(recipeInstance: SessionRecipe, userId: string): Promise<string[]>;
/**
 * @description call to destroy one session
 * @returns true if session was deleted from db. Else false in case there was nothing to delete
 * @throws AuthError, GENERAL_ERROR
 */
export declare function revokeSession(recipeInstance: SessionRecipe, sessionHandle: string): Promise<boolean>;
/**
 * @description call to destroy multiple sessions
 * @returns list of sessions revoked
 * @throws AuthError, GENERAL_ERROR
 */
export declare function revokeMultipleSessions(recipeInstance: SessionRecipe, sessionHandles: string[]): Promise<string[]>;
/**
 * @description: this function reads from the database every time. It provides no locking mechanism in case other processes are updating session data for this session as well, so please take of that by yourself.
 * @returns session data as provided by the user earlier
 * @throws AuthError GENERAL_ERROR, UNAUTHORISED.
 */
export declare function getSessionData(recipeInstance: SessionRecipe, sessionHandle: string): Promise<any>;
/**
 * @description: It provides no locking mechanism in case other processes are updating session data for this session as well.
 * @throws AuthError GENERAL_ERROR, UNAUTHORISED.
 */
export declare function updateSessionData(recipeInstance: SessionRecipe, sessionHandle: string, newSessionData: any): Promise<void>;
/**
 * @returns jwt payload as provided by the user earlier
 * @throws AuthError GENERAL_ERROR, UNAUTHORISED.
 */
export declare function getJWTPayload(recipeInstance: SessionRecipe, sessionHandle: string): Promise<any>;
/**
 * @throws AuthError GENERAL_ERROR, UNAUTHORISED.
 */
export declare function updateJWTPayload(recipeInstance: SessionRecipe, sessionHandle: string, newJWTPayload: any): Promise<void>;
