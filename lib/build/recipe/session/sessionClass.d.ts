// @ts-nocheck
import { BaseResponse } from "../../framework";
import { SessionContainerInterface } from "./types";
import RecipeImplementation from "./recipeImplementation";
export default class Session implements SessionContainerInterface {
    private sessionHandle;
    private userId;
    private userDataInAccessToken;
    private res;
    private accessToken;
    private recipeImplementation;
    constructor(
        recipeImplementation: RecipeImplementation,
        accessToken: string,
        sessionHandle: string,
        userId: string,
        userDataInAccessToken: any,
        res: BaseResponse
    );
    revokeSession: () => Promise<void>;
    getSessionData: () => Promise<any>;
    updateSessionData: (newSessionData: any) => Promise<void>;
    getUserId: () => string;
    getAccessTokenPayload: () => any;
    getHandle: () => string;
    getAccessToken: () => string;
    updateAccessTokenPayload: (newAccessTokenPayload: any) => Promise<void>;
    getTimeCreated: () => Promise<number>;
    getExpiry: () => Promise<number>;
}
