import * as express from "express";
import { TypeInput, SessionRequest } from "./types";
/**
 * @description: to be called by user of the library. This initiates all the modules necessary for this library to work.
 * Please create a database in your mongo instance before calling this function
 * @param config
 * @param client: mongo client. Default is undefined. If you provide this, please make sure that it is already connected to the right database that has the auth collections. If you do not provide this, then the library will manage its own connection.
 * @throws AuthError GENERAL_ERROR in case anything fails.
 */
export declare function init(config: TypeInput): void;
/**
 * @description call this to "login" a user. This overwrites any existing session that exists.
 * To check if a session exists, call getSession function.
 * @throws GENERAL_ERROR in case anything fails.
 * @sideEffect sets cookies in res
 */
export declare function createNewSession(res: express.Response, userId: string, jwtPayload?: any, sessionData?: any): Promise<Session>;
/**
 * @description authenticates a session. To be used in APIs that require authentication
 * @throws AuthError, GENERAL_ERROR, UNAUTHORISED and TRY_REFRESH_TOKEN
 * @sideEffects may remove cookies, or change the accessToken.
 */
export declare function getSession(req: express.Request, res: express.Response, doAntiCsrfCheck: boolean): Promise<Session>;
/**
 * @description generates new access and refresh tokens for a given refresh token. Called when client's access token has expired.
 * @throws AuthError, GENERAL_ERROR, UNAUTHORISED, TOKEN_THEFT_DETECTED
 * @sideEffects may remove cookies, or change the accessToken and refreshToken.
 */
export declare function refreshSession(req: express.Request, res: express.Response): Promise<Session>;
/**
 * @description deletes session info of a user from db. This only invalidates the refresh token. Not the access token.
 * Access tokens cannot be immediately invalidated, unless we enable a blacklisting. Or changed the private key to sign them.
 * @throws AuthError, GENERAL_ERROR
 */
export declare function revokeAllSessionsForUser(userId: string): Promise<any>;
/**
 * @description gets all session handles for current user. Please do not call this unless this user is authenticated.
 * @throws AuthError, GENERAL_ERROR
 */
export declare function getAllSessionHandlesForUser(userId: string): Promise<string[]>;
/**
 * @description call to destroy one session. This will not clear cookies, so if you have a Session object, please use that.
 * @returns true if session was deleted from db. Else false in case there was nothing to delete
 * @throws AuthError, GENERAL_ERROR
 */
export declare function revokeSession(sessionHandle: string): Promise<boolean>;
/**
 * @description call to destroy multiple sessions
 * @returns list of sessions revoked
 * @throws AuthError, GENERAL_ERROR
 */
export declare function revokeMultipleSessions(sessionHandles: string[]): Promise<any>;
/**
 * @description: this function reads from the database every time. It provides no locking mechanism in case other processes are updating session data for this session as well, so please take of that by yourself. If you have a Session object, please use that instead.
 * @returns session data as provided by the user earlier
 * @throws AuthError GENERAL_ERROR, UNAUTHORISED.
 */
export declare function getSessionData(sessionHandle: string): Promise<any>;
/**
 * @description: It provides no locking mechanism in case other processes are updating session data for this session as well. If you have a Session object, please use that instead.
 * @throws AuthError GENERAL_ERROR, UNAUTHORISED.
 */
export declare function updateSessionData(sessionHandle: string, newSessionData: any): Promise<void>;
/**
 * @description Sets relevant Access-Control-Allow-Headers and Access-Control-Allow-Credentials headers
 */
export declare function setRelevantHeadersForOptionsAPI(res: express.Response): void;
/**
 * @returns jwt payload as provided by the user earlier
 * @throws AuthError GENERAL_ERROR, UNAUTHORISED.
 */
export declare function getJWTPayload(sessionHandle: string): Promise<any>;
/**
 * @throws AuthError GENERAL_ERROR, UNAUTHORISED.
 */
export declare function updateJWTPayload(sessionHandle: string, newJWTPayload: any): Promise<void>;
export declare function auth0Handler(request: SessionRequest, response: express.Response, domain: string, clientId: string, clientSecret: string, callback?: (userId: string, idToken: string) => Promise<void>): Promise<express.Response>;
/**
 * @class Session
 * @description an instance of this is created when a session is valid.
 */
export declare class Session {
    private sessionHandle;
    private userId;
    private userDataInJWT;
    private res;
    private accessToken;
    constructor(accessToken: string, sessionHandle: string, userId: string, userDataInJWT: any, res: express.Response);
    /**
     * @description call this to logout the current user.
     * This only invalidates the refresh token. The access token can still be used after
     * @sideEffect may clear cookies from response.
     * @throw AuthError GENERAL_ERROR
     */
    revokeSession: () => Promise<void>;
    /**
     * @description: this function reads from the database every time. It provides no locking mechanism in case other processes are updating session data for this session as well, so please take of that by yourself.
     * @returns session data as provided by the user earlier
     * @sideEffect may clear cookies from response.
     * @throws AuthError GENERAL_ERROR, UNAUTHORISED.
     */
    getSessionData: () => Promise<any>;
    /**
     * @description: It provides no locking mechanism in case other processes are updating session data for this session as well.
     * @sideEffect may clear cookies from response.
     * @throws AuthError GENERAL_ERROR, UNAUTHORISED.
     */
    updateSessionData: (newSessionData: any) => Promise<void>;
    getUserId: () => string;
    getJWTPayload: () => any;
    getHandle: () => string;
    getAccessToken: () => string;
    updateJWTPayload: (newJWTPayload: any) => Promise<void>;
}
