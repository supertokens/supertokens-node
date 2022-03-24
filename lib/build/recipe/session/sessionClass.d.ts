// @ts-nocheck
import { BaseResponse } from "../../framework";
import { SessionClaim, SessionClaimPayloadType, SessionContainerInterface } from "./types";
import { Helpers } from "./recipeImplementation";
import { Awaitable } from "../../types";
export default class Session implements SessionContainerInterface {
    protected sessionHandle: string;
    protected userId: string;
    protected userDataInAccessToken: any;
    protected claims: SessionClaimPayloadType;
    protected res: BaseResponse;
    protected accessToken: string;
    protected helpers: Helpers;
    constructor(
        helpers: Helpers,
        accessToken: string,
        sessionHandle: string,
        userId: string,
        userDataInAccessToken: any,
        claims: SessionClaimPayloadType,
        res: BaseResponse
    );
    revokeSession: (userContext?: any) => Promise<void>;
    getSessionData: (userContext?: any) => Promise<any>;
    updateSessionData: (newSessionData: any, userContext?: any) => Promise<void>;
    getUserId: () => string;
    getAccessTokenPayload: () => any;
    getHandle: () => string;
    getAccessToken: () => string;
    updateAccessTokenPayload: (newAccessTokenPayload: any, userContext?: any) => Promise<void>;
    getTimeCreated: (userContext?: any) => Promise<number>;
    getExpiry: (userContext?: any) => Promise<number>;
    getSessionClaimPayload(): Record<string, import("../../types").JSONObject>;
    updateClaim(claim: SessionClaim<any>, userContext?: any): Promise<void>;
    updateClaims(claims: SessionClaim<any>[], userContext?: any): Promise<void>;
    checkClaimInToken(claim: SessionClaim<any>, userContext?: any): Awaitable<boolean>;
    addClaim<T>(claim: SessionClaim<T>, value: T, userContext?: any): Promise<void>;
    removeClaim<T>(claim: SessionClaim<T>, userContext?: any): Promise<void>;
    regenerateToken(
        newAccessTokenPayload: any | undefined,
        newClaimPayload: SessionClaimPayloadType | undefined,
        userContext: any
    ): Promise<void>;
}
