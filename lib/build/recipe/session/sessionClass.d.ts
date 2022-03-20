// @ts-nocheck
import { BaseResponse } from "../../framework";
import { Grant, GrantPayloadType, SessionContainerInterface } from "./types";
import { Helpers } from "./recipeImplementation";
import { Awaitable } from "../../types";
export default class Session implements SessionContainerInterface {
    protected sessionHandle: string;
    protected userId: string;
    protected userDataInAccessToken: any;
    protected grants: GrantPayloadType;
    protected res: BaseResponse;
    protected accessToken: string;
    protected helpers: Helpers;
    constructor(
        helpers: Helpers,
        accessToken: string,
        sessionHandle: string,
        userId: string,
        userDataInAccessToken: any,
        grants: GrantPayloadType,
        res: BaseResponse
    );
    revokeSession: (userContext?: any) => Promise<void>;
    getSessionData: (userContext?: any) => Promise<any>;
    updateSessionData: (newSessionData: any, userContext?: any) => Promise<void>;
    getUserId: () => string;
    getAccessTokenPayload: () => any;
    getHandle: () => string;
    getAccessToken: () => string;
    updateSessionGrants: (
        newGrants: Record<string, import("../../types").JSONObject>,
        userContext?: any
    ) => Promise<void>;
    updateAccessTokenPayload: (newAccessTokenPayload: any, userContext?: any) => Promise<void>;
    getTimeCreated: (userContext?: any) => Promise<number>;
    getExpiry: (userContext?: any) => Promise<number>;
    getSessionGrants(): Record<string, import("../../types").JSONObject>;
    shouldRefetchGrant(grant: Grant<any>, userContext?: any): Awaitable<boolean>;
    fetchGrant(grant: Grant<any>, userContext?: any): Promise<void>;
    checkGrantInToken(grant: Grant<any>, userContext?: any): Awaitable<boolean>;
    addGrant<T>(grant: Grant<T>, value: T, userContext?: any): Promise<void>;
    removeGrant<T>(grant: Grant<T>, userContext?: any): Promise<void>;
}
