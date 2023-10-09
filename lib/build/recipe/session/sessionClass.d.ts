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
    getRecipeUserId(_userContext?: any): RecipeUserId;
    revokeSession(userContext?: any): Promise<void>;
    getSessionDataFromDatabase(userContext?: any): Promise<any>;
    updateSessionDataInDatabase(newSessionData: any, userContext?: any): Promise<void>;
    getUserId(_userContext?: any): string;
    getTenantId(_userContext?: any): string;
    getAccessTokenPayload(_userContext?: any): any;
    getHandle(): string;
    getAccessToken(): string;
    getAllSessionTokensDangerously(): {
        accessToken: string;
        accessAndFrontTokenUpdated: boolean;
        refreshToken: string | undefined;
        frontToken: string;
        antiCsrfToken: string | undefined;
    };
    mergeIntoAccessTokenPayload(accessTokenPayloadUpdate: any, userContext?: any): Promise<void>;
    getTimeCreated(userContext?: any): Promise<number>;
    getExpiry(userContext?: any): Promise<number>;
    assertClaims(claimValidators: SessionClaimValidator[], userContext?: any): Promise<void>;
    fetchAndSetClaim<T>(claim: SessionClaim<T>, userContext?: any): Promise<void>;
    setClaimValue<T>(claim: SessionClaim<T>, value: T, userContext?: any): Promise<void>;
    getClaimValue<T>(claim: SessionClaim<T>, userContext?: any): Promise<T | undefined>;
    removeClaim(claim: SessionClaim<any>, userContext?: any): Promise<void>;
    attachToRequestResponse(info: ReqResInfo, userContext?: any): void;
}
