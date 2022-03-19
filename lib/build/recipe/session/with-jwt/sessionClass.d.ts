// @ts-nocheck
import { RecipeInterface as OpenIdRecipeInterface } from "../../openid/types";
import { Grant, SessionContainerInterface } from "../types";
import { Awaitable } from "../../../types";
export default class SessionClassWithJWT implements SessionContainerInterface {
    private openIdRecipeImplementation;
    private originalSessionClass;
    constructor(originalSessionClass: SessionContainerInterface, openIdRecipeImplementation: OpenIdRecipeInterface);
    revokeSession: (userContext?: any) => Promise<void>;
    getSessionData: (userContext?: any) => Promise<any>;
    updateSessionData: (newSessionData: any, userContext?: any) => Promise<any>;
    getUserId: (userContext?: any) => string;
    getAccessTokenPayload: (userContext?: any) => any;
    getHandle: (userContext?: any) => string;
    getAccessToken: (userContext?: any) => string;
    getTimeCreated: (userContext?: any) => Promise<number>;
    getExpiry: (userContext?: any) => Promise<number>;
    getSessionGrants(userContext?: any): any;
    updateSessionGrants(grants: Grant<any>[], userContext?: any): Promise<void>;
    shouldRefetchGrant(grant: Grant<any>, userContext?: any): Awaitable<boolean>;
    fetchGrant(grant: Grant<any>, userContext?: any): Awaitable<void>;
    checkGrantInToken(grant: Grant<any>, userContext?: any): Awaitable<boolean>;
    addGrant<T>(grant: Grant<T>, value: T, userContext?: any): Promise<void>;
    removeGrant<T>(grant: Grant<T>, userContext?: any): Promise<void>;
    updateAccessTokenPayload: (newAccessTokenPayload: any, userContext?: any) => Promise<void>;
}
