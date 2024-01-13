// @ts-nocheck
import { SessionClaim, SessionClaimValidator, SessionContainerInterface, ReqResInfo, TokenInfo } from "./types";
import { Helpers } from "./recipeImplementation";
import RecipeUserId from "../../recipeUserId";
export default class Session implements SessionContainerInterface {
    protected helpers: Helpers;
    protected accessToken: string;
    protected frontToken: string;
    protected refreshToken: TokenInfo | undefined;
    protected antiCsrfToken: string | undefined;
    protected sessionHandle: string;
    protected userId: string;
    protected recipeUserId: RecipeUserId;
    protected userDataInAccessToken: any;
    protected reqResInfo: ReqResInfo | undefined;
    protected accessTokenUpdated: boolean;
    protected tenantId: string;
    constructor(
        helpers: Helpers,
        accessToken: string,
        frontToken: string,
        refreshToken: TokenInfo | undefined,
        antiCsrfToken: string | undefined,
        sessionHandle: string,
        userId: string,
        recipeUserId: RecipeUserId,
        userDataInAccessToken: any,
        reqResInfo: ReqResInfo | undefined,
        accessTokenUpdated: boolean,
        tenantId: string
    );
    getRecipeUserId(_userContext?: Record<string, any>): RecipeUserId;
    revokeSession(userContext?: Record<string, any>): Promise<void>;
    getSessionDataFromDatabase(userContext?: Record<string, any>): Promise<any>;
    updateSessionDataInDatabase(newSessionData: any, userContext?: Record<string, any>): Promise<void>;
    getUserId(_userContext?: Record<string, any>): string;
    getTenantId(_userContext?: Record<string, any>): string;
    getAccessTokenPayload(_userContext?: Record<string, any>): any;
    getHandle(): string;
    getAccessToken(): string;
    getAllSessionTokensDangerously(): {
        accessToken: string;
        accessAndFrontTokenUpdated: boolean;
        refreshToken: string | undefined;
        frontToken: string;
        antiCsrfToken: string | undefined;
    };
    mergeIntoAccessTokenPayload(accessTokenPayloadUpdate: any, userContext?: Record<string, any>): Promise<void>;
    getTimeCreated(userContext?: Record<string, any>): Promise<number>;
    getExpiry(userContext?: Record<string, any>): Promise<number>;
    assertClaims(claimValidators: SessionClaimValidator[], userContext?: Record<string, any>): Promise<void>;
    fetchAndSetClaim<T>(claim: SessionClaim<T>, userContext?: Record<string, any>): Promise<void>;
    setClaimValue<T>(claim: SessionClaim<T>, value: T, userContext?: Record<string, any>): Promise<void>;
    getClaimValue<T>(claim: SessionClaim<T>, userContext?: Record<string, any>): Promise<T | undefined>;
    removeClaim(claim: SessionClaim<any>, userContext?: Record<string, any>): Promise<void>;
    attachToRequestResponse(info: ReqResInfo, userContext?: Record<string, any>): void;
}
