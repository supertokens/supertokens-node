import { BaseResponse } from "../../framework";
import { SessionContainerInterface } from "./types";
import RecipeImplementation from "./recipeImplementation";
export default class Session implements SessionContainerInterface {
    private sessionHandle;
    private userId;
    private userDataInJWT;
    private res;
    private accessToken;
    private recipeImplementation;
    constructor(
        recipeImplementation: RecipeImplementation,
        accessToken: string,
        sessionHandle: string,
        userId: string,
        userDataInJWT: any,
        res: BaseResponse
    );
    revokeSession: () => Promise<void>;
    getSessionData: () => Promise<any>;
    updateSessionData: (newSessionData: any) => Promise<void>;
    getUserId: () => string;
    getJWTPayload: () => any;
    getHandle: () => string;
    getAccessToken: () => string;
    updateJWTPayload: (newJWTPayload: any) => Promise<void>;
}
