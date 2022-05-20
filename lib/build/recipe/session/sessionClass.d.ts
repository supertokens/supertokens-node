// @ts-nocheck
import { BaseResponse } from "../../framework";
import { SessionClaimValidator, SessionContainerInterface } from "./types";
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
    revokeSession: (userContext?: any) => Promise<void>;
    getSessionData: (userContext?: any) => Promise<any>;
    updateSessionData: (newSessionData: any, userContext?: any) => Promise<void>;
    getUserId: () => string;
    getAccessTokenPayload: () => any;
    getHandle: () => string;
    getAccessToken: () => string;
    mergeIntoAccessTokenPayload: (accessTokenPayloadUpdate: any, userContext?: any) => Promise<void>;
    getTimeCreated: (userContext?: any) => Promise<number>;
    getExpiry: (userContext?: any) => Promise<number>;
    validateClaims(claimValidators: SessionClaimValidator[], userContext?: any): Promise<void>;
    updateAccessTokenPayload(newAccessTokenPayload: any | undefined, userContext: any): Promise<void>;
}
