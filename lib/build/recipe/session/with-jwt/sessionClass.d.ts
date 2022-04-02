// @ts-nocheck
import { RecipeInterface as OpenIdRecipeInterface } from "../../openid/types";
import { SessionClaim, SessionClaimChecker, SessionContainerInterface } from "../types";
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
    updateClaim: (claim: SessionClaim<any>, userContext?: any) => Promise<void>;
    updateClaims: (claims: SessionClaim<any>[], userContext?: any) => Promise<void>;
    addClaim: <T>(claim: SessionClaim<T>, value: T, userContext?: any) => Promise<void>;
    removeClaim: <T>(claim: SessionClaim<T>, userContext?: any) => Promise<void>;
    checkClaim(claimChecker: SessionClaimChecker, userContext?: any): Promise<boolean>;
    checkClaims(claimCheckers: SessionClaimChecker[], userContext?: any): Promise<string | undefined>;
    updateAccessTokenPayload: (newAccessTokenPayload: any, userContext?: any) => Promise<void>;
    regenerateToken: (newAccessTokenPayload: any, userContext: any) => Promise<void>;
}
