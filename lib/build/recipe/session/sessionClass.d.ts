// @ts-nocheck
import { BaseResponse } from "../../framework";
import { SessionContainerInterface } from "./types";
import { Helpers } from "./recipeImplementation";
export default class Session implements SessionContainerInterface {
    protected sessionHandle: string;
    protected userId: string;
    protected userDataInAccessToken: any;
    protected res: BaseResponse;
    protected accessToken: string;
    protected helpers: Helpers;
    constructor(
        helpers: Helpers,
        accessToken: string,
        sessionHandle: string,
        userId: string,
        userDataInAccessToken: any,
        res: BaseResponse
    );
    revokeSession: (_?: any) => Promise<void>;
    getSessionData: (_?: any) => Promise<any>;
    updateSessionData: (newSessionData: any, _?: any) => Promise<void>;
    getUserId: () => string;
    getAccessTokenPayload: () => any;
    getHandle: () => string;
    getAccessToken: () => string;
    updateAccessTokenPayload: (newAccessTokenPayload: any, _?: any) => Promise<void>;
    getTimeCreated: (_?: any) => Promise<number>;
    getExpiry: (_?: any) => Promise<number>;
}
