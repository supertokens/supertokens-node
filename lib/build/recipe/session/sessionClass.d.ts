import * as express from "express";
import SessionRecipe from "./sessionRecipe";
export default class Session {
    private sessionHandle;
    private userId;
    private userDataInJWT;
    private res;
    private accessToken;
    private recipeInstance;
    constructor(recipeInstance: SessionRecipe, accessToken: string, sessionHandle: string, userId: string, userDataInJWT: any, res: express.Response);
    revokeSession: () => Promise<void>;
    getSessionData: () => Promise<any>;
    updateSessionData: (newSessionData: any) => Promise<void>;
    getUserId: () => string;
    getJWTPayload: () => any;
    getHandle: () => string;
    getAccessToken: () => string;
    updateJWTPayload: (newJWTPayload: any) => Promise<void>;
}
