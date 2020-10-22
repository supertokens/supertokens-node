import * as express from "express";
import SessionRecipe from "./sessionRecipe";
export default class Session {
    private sessionHandle;
    private userId;
    private userDataInJWT;
    private res;
    private accessToken;
    private accessTokenExpiry;
    private recipeInstance;
    constructor(recipeInstance: SessionRecipe, accessToken: string, sessionHandle: string, userId: string, userDataInJWT: any, accessTokenExpiry: number | undefined, res: express.Response);
    getAccessTokenExpiry: () => number | undefined;
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
