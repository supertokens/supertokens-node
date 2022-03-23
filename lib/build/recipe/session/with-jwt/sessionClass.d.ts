// @ts-nocheck
import { RecipeInterface as OpenIdRecipeInterface } from "../../openid/types";
import { SessionClaim, SessionContainerInterface } from "../types";
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
    getSessionClaims(userContext?: any): any;
    updateSessionClaims(claims: SessionClaim<any>[], userContext?: any): Promise<void>;
    shouldRefetchClaim(claim: SessionClaim<any>, userContext?: any): Awaitable<boolean>;
    fetchClaim(claim: SessionClaim<any>, userContext?: any): Awaitable<void>;
    checkClaimInToken(claim: SessionClaim<any>, userContext?: any): Awaitable<boolean>;
    addClaim<T>(claim: SessionClaim<T>, value: T, userContext?: any): Promise<void>;
    removeClaim<T>(claim: SessionClaim<T>, userContext?: any): Promise<void>;
    updateAccessTokenPayload: (newAccessTokenPayload: any, userContext?: any) => Promise<void>;
}
