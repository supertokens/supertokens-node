// @ts-nocheck
import { SessionClaim, SessionClaimValidator, SessionContainerInterface, ReqResInfo, TokenInfo } from "./types";
import { Helpers } from "./recipeImplementation";
import RecipeUserId from "../../recipeUserId";
import { UserContext } from "../../types";
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
    getRecipeUserId(_userContext?: UserContext): RecipeUserId;
    revokeSession(userContext?: UserContext): Promise<void>;
    getSessionDataFromDatabase(userContext?: UserContext): Promise<any>;
    updateSessionDataInDatabase(newSessionData: any, userContext?: UserContext): Promise<void>;
    getUserId(_userContext?: UserContext): string;
    getTenantId(_userContext?: UserContext): string;
    getAccessTokenPayload(_userContext?: UserContext): any;
    getHandle(): string;
    getAccessToken(): string;
    getAllSessionTokensDangerously(): {
        accessToken: string;
        accessAndFrontTokenUpdated: boolean;
        refreshToken: string | undefined;
        frontToken: string;
        antiCsrfToken: string | undefined;
    };
    mergeIntoAccessTokenPayload(accessTokenPayloadUpdate: any, userContext?: UserContext): Promise<void>;
    getTimeCreated(userContext?: UserContext): Promise<number>;
    getExpiry(userContext?: UserContext): Promise<number>;
    assertClaims(claimValidators: SessionClaimValidator[], userContext?: UserContext): Promise<void>;
    fetchAndSetClaim<T>(claim: SessionClaim<T>, userContext?: UserContext): Promise<void>;
    setClaimValue<T>(claim: SessionClaim<T>, value: T, userContext?: UserContext): Promise<void>;
    getClaimValue<T>(claim: SessionClaim<T>, userContext?: UserContext): Promise<T | undefined>;
    removeClaim(claim: SessionClaim<any>, userContext?: UserContext): Promise<void>;
    attachToRequestResponse(info: ReqResInfo, userContext?: UserContext): void;
}
