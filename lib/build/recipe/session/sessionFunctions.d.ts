// @ts-nocheck
import { ParsedJWTInfo } from "./jwt";
import { CreateOrRefreshAPIResponse, SessionInformation, TypeNormalisedInput } from "./types";
import { Helpers } from "./recipeImplementation";
import RecipeUserId from "../../recipeUserId";
import { UserContext } from "../../types";
/**
 * @description call this to "login" a user.
 */
export declare function createNewSession(
    helpers: Helpers,
    tenantId: string,
    recipeUserId: RecipeUserId,
    disableAntiCsrf: boolean,
    accessTokenPayload: any,
    sessionDataInDatabase: any,
    userContext: UserContext
): Promise<CreateOrRefreshAPIResponse>;
/**
 * @description authenticates a session. To be used in APIs that require authentication
 */
export declare function getSession(
    helpers: Helpers,
    parsedAccessToken: ParsedJWTInfo,
    antiCsrfToken: string | undefined,
    doAntiCsrfCheck: boolean,
    alwaysCheckCore: boolean,
    config: TypeNormalisedInput,
    userContext: UserContext
): Promise<{
    session: {
        handle: string;
        userId: string;
        recipeUserId: RecipeUserId;
        userDataInJWT: any;
        expiryTime: number;
        tenantId: string;
    };
    accessToken?: {
        token: string;
        expiry: number;
        createdTime: number;
    };
}>;
/**
 * @description Retrieves session information from storage for a given session handle
 * @returns session data stored in the database, including userData and access token payload, or undefined if sessionHandle is invalid
 */
export declare function getSessionInformation(
    helpers: Helpers,
    sessionHandle: string,
    userContext: UserContext
): Promise<SessionInformation | undefined>;
/**
 * @description generates new access and refresh tokens for a given refresh token. Called when client's access token has expired.
 * @sideEffects calls onTokenTheftDetection if token theft is detected.
 */
export declare function refreshSession(
    helpers: Helpers,
    refreshToken: string,
    antiCsrfToken: string | undefined,
    disableAntiCsrf: boolean,
    useDynamicAccessTokenSigningKey: boolean,
    userContext: UserContext
): Promise<CreateOrRefreshAPIResponse>;
/**
 * @description deletes session info of a user from db. This only invalidates the refresh token. Not the access token.
 * Access tokens cannot be immediately invalidated. Unless we add a blacklisting method. Or changed the private key to sign them.
 */
export declare function revokeAllSessionsForUser(
    helpers: Helpers,
    userId: string,
    revokeSessionsForLinkedAccounts: boolean,
    tenantId: string | undefined,
    revokeAcrossAllTenants: boolean | undefined,
    userContext: UserContext
): Promise<string[]>;
/**
 * @description gets all session handles for current user. Please do not call this unless this user is authenticated.
 */
export declare function getAllSessionHandlesForUser(
    helpers: Helpers,
    userId: string,
    fetchSessionsForAllLinkedAccounts: boolean,
    tenantId: string | undefined,
    fetchAcrossAllTenants: boolean | undefined,
    userContext: UserContext
): Promise<string[]>;
/**
 * @description call to destroy one session
 * @returns true if session was deleted from db. Else false in case there was nothing to delete
 */
export declare function revokeSession(
    helpers: Helpers,
    sessionHandle: string,
    userContext: UserContext
): Promise<boolean>;
/**
 * @description call to destroy multiple sessions
 * @returns list of sessions revoked
 */
export declare function revokeMultipleSessions(
    helpers: Helpers,
    sessionHandles: string[],
    userContext: UserContext
): Promise<string[]>;
/**
 * @description: It provides no locking mechanism in case other processes are updating session data for this session as well.
 */
export declare function updateSessionDataInDatabase(
    helpers: Helpers,
    sessionHandle: string,
    newSessionData: any,
    userContext: UserContext
): Promise<boolean>;
export declare function updateAccessTokenPayload(
    helpers: Helpers,
    sessionHandle: string,
    newAccessTokenPayload: any,
    userContext: UserContext
): Promise<boolean>;
