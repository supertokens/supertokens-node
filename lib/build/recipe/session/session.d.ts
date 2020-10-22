import { TypeInput, CreateOrRefreshAPIResponse } from "./types";
export declare class SessionConfig {
    private static instance;
    sessionExpiredStatusCode: number;
    constructor(sessionExpiredStatusCode: number);
    static init(sessionExpiredStatusCode: number): void;
    static reset(): void;
    static getInstanceOrThrowError(): SessionConfig;
}
/**
 * @description: to be called by user of the library. This initiates all the modules necessary for this library to work.
 * Please create a database in your mysql instance before calling this function
 * @throws AuthError GENERAL_ERROR in case anything fails.
 */
export declare function init(config: TypeInput): void;
/**
 * @description call this to "login" a user.
 * @throws GENERAL_ERROR in case anything fails.
 */
export declare function createNewSession(userId: string, jwtPayload?: any, sessionData?: any): Promise<CreateOrRefreshAPIResponse>;
/**
 * @description authenticates a session. To be used in APIs that require authentication
 * @throws AuthError, GENERAL_ERROR, UNAUTHORISED and TRY_REFRESH_TOKEN
 */
export declare function getSession(accessToken: string, antiCsrfToken: string | undefined, doAntiCsrfCheck: boolean): Promise<{
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
export declare function refreshSession(refreshToken: string, antiCsrfToken: string | undefined): Promise<CreateOrRefreshAPIResponse>;
/**
 * @description deletes session info of a user from db. This only invalidates the refresh token. Not the access token.
 * Access tokens cannot be immediately invalidated. Unless we add a bloacklisting method. Or changed the private key to sign them.
 * @throws AuthError, GENERAL_ERROR
 */
export declare function revokeAllSessionsForUser(userId: string): Promise<string[]>;
/**
 * @description gets all session handles for current user. Please do not call this unless this user is authenticated.
 * @throws AuthError, GENERAL_ERROR
 */
export declare function getAllSessionHandlesForUser(userId: string): Promise<string[]>;
/**
 * @description call to destroy one session
 * @returns true if session was deleted from db. Else false in case there was nothing to delete
 * @throws AuthError, GENERAL_ERROR
 */
export declare function revokeSession(sessionHandle: string): Promise<boolean>;
/**
 * @description call to destroy multiple sessions
 * @returns list of sessions revoked
 * @throws AuthError, GENERAL_ERROR
 */
export declare function revokeMultipleSessions(sessionHandles: string[]): Promise<string[]>;
/**
 * @description: this function reads from the database every time. It provides no locking mechanism in case other processes are updating session data for this session as well, so please take of that by yourself.
 * @returns session data as provided by the user earlier
 * @throws AuthError GENERAL_ERROR, UNAUTHORISED.
 */
export declare function getSessionData(sessionHandle: string): Promise<any>;
/**
 * @description: It provides no locking mechanism in case other processes are updating session data for this session as well.
 * @throws AuthError GENERAL_ERROR, UNAUTHORISED.
 */
export declare function updateSessionData(sessionHandle: string, newSessionData: any): Promise<void>;
/**
 * @returns jwt payload as provided by the user earlier
 * @throws AuthError GENERAL_ERROR, UNAUTHORISED.
 */
export declare function getJWTPayload(sessionHandle: string): Promise<any>;
/**
 * @throws AuthError GENERAL_ERROR, UNAUTHORISED.
 */
export declare function updateJWTPayload(sessionHandle: string, newJWTPayload: any): Promise<void>;
