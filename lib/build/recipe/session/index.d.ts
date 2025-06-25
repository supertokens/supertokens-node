// @ts-nocheck
import SuperTokensError from "./error";
import {
    VerifySessionOptions,
    SessionContainerInterface as SessionContainer,
    SessionInformation,
    APIInterface,
    APIOptions,
    SessionClaimValidator,
    SessionClaim,
    ClaimValidationError,
    RecipeInterface,
} from "./types";
import Recipe from "./recipe";
import { JSONObject, UserContext } from "../../types";
import RecipeUserId from "../../recipeUserId";
export default class SessionWrapper {
    static init: typeof Recipe.init;
    static Error: typeof SuperTokensError;
    static createNewSession(
        req: any,
        res: any,
        tenantId: string,
        recipeUserId: RecipeUserId,
        accessTokenPayload?: any,
        sessionDataInDatabase?: any,
        userContext?: Record<string, any>
    ): Promise<SessionContainer>;
    static createNewSessionWithoutRequestResponse(
        tenantId: string,
        recipeUserId: RecipeUserId,
        accessTokenPayload?: any,
        sessionDataInDatabase?: any,
        disableAntiCsrf?: boolean,
        userContext?: Record<string, any>
    ): Promise<SessionContainer>;
    static validateClaimsForSessionHandle(
        sessionHandle: string,
        overrideGlobalClaimValidators?: (
            globalClaimValidators: SessionClaimValidator[],
            sessionInfo: SessionInformation,
            userContext: UserContext
        ) => Promise<SessionClaimValidator[]> | SessionClaimValidator[],
        userContext?: Record<string, any>
    ): Promise<
        | {
              status: "SESSION_DOES_NOT_EXIST_ERROR";
          }
        | {
              status: "OK";
              invalidClaims: ClaimValidationError[];
          }
    >;
    static getSession(req: any, res: any): Promise<SessionContainer>;
    static getSession(
        req: any,
        res: any,
        options?: VerifySessionOptions & {
            sessionRequired?: true;
        },
        userContext?: Record<string, any>
    ): Promise<SessionContainer>;
    static getSession(
        req: any,
        res: any,
        options?: VerifySessionOptions & {
            sessionRequired: false;
        },
        userContext?: Record<string, any>
    ): Promise<SessionContainer | undefined>;
    static getSession(
        req: any,
        res: any,
        options?: VerifySessionOptions,
        userContext?: Record<string, any>
    ): Promise<SessionContainer | undefined>;
    /**
     * Tries to validate an access token and build a Session object from it.
     *
     * Notes about anti-csrf checking:
     * - if the `antiCsrf` is set to VIA_HEADER in the Session recipe config you have to handle anti-csrf checking before calling this function and set antiCsrfCheck to false in the options.
     * - you can disable anti-csrf checks by setting antiCsrf to NONE in the Session recipe config. We only recommend this if you are always getting the access-token from the Authorization header.
     * - if the antiCsrf check fails the returned satatus will be TRY_REFRESH_TOKEN_ERROR
     *
     * Results:
     * OK: The session was successfully validated, including claim validation
     * CLAIM_VALIDATION_ERROR: While the access token is valid, one or more claim validators have failed. Our frontend SDKs expect a 403 response the contents matching the value returned from this function.
     * TRY_REFRESH_TOKEN_ERROR: This means, that the access token structure was valid, but it didn't pass validation for some reason and the user should call the refresh API.
     *  You can send a 401 response to trigger this behaviour if you are using our frontend SDKs
     * UNAUTHORISED: This means that the access token likely doesn't belong to a SuperTokens session. If this is unexpected, it's best handled by sending a 401 response.
     *
     * @param accessToken The access token extracted from the authorization header or cookies
     * @param antiCsrfToken The anti-csrf token extracted from the authorization header or cookies. Can be undefined if antiCsrfCheck is false
     * @param options Same options objects as getSession or verifySession takes, except the `sessionRequired` prop, which is always set to true in this function
     * @param userContext User context
     */
    static getSessionWithoutRequestResponse(accessToken: string, antiCsrfToken?: string): Promise<SessionContainer>;
    static getSessionWithoutRequestResponse(
        accessToken: string,
        antiCsrfToken?: string,
        options?: VerifySessionOptions & {
            sessionRequired?: true;
        },
        userContext?: Record<string, any>
    ): Promise<SessionContainer>;
    static getSessionWithoutRequestResponse(
        accessToken: string,
        antiCsrfToken?: string,
        options?: VerifySessionOptions & {
            sessionRequired: false;
        },
        userContext?: Record<string, any>
    ): Promise<SessionContainer | undefined>;
    static getSessionWithoutRequestResponse(
        accessToken: string,
        antiCsrfToken?: string,
        options?: VerifySessionOptions,
        userContext?: Record<string, any>
    ): Promise<SessionContainer | undefined>;
    static getSessionInformation(
        sessionHandle: string,
        userContext?: Record<string, any>
    ): Promise<SessionInformation | undefined>;
    static refreshSession(req: any, res: any, userContext?: Record<string, any>): Promise<SessionContainer>;
    static refreshSessionWithoutRequestResponse(
        refreshToken: string,
        disableAntiCsrf?: boolean,
        antiCsrfToken?: string,
        userContext?: Record<string, any>
    ): Promise<SessionContainer>;
    static revokeAllSessionsForUser(
        userId: string,
        revokeSessionsForLinkedAccounts?: boolean,
        tenantId?: string,
        userContext?: Record<string, any>
    ): Promise<string[]>;
    static getAllSessionHandlesForUser(
        userId: string,
        fetchSessionsForAllLinkedAccounts?: boolean,
        tenantId?: string,
        userContext?: Record<string, any>
    ): Promise<string[]>;
    static revokeSession(sessionHandle: string, userContext?: Record<string, any>): Promise<boolean>;
    static revokeMultipleSessions(sessionHandles: string[], userContext?: Record<string, any>): Promise<string[]>;
    static updateSessionDataInDatabase(
        sessionHandle: string,
        newSessionData: any,
        userContext?: Record<string, any>
    ): Promise<boolean>;
    static mergeIntoAccessTokenPayload(
        sessionHandle: string,
        accessTokenPayloadUpdate: JSONObject,
        userContext?: Record<string, any>
    ): Promise<boolean>;
    static createJWT(
        payload?: any,
        validitySeconds?: number,
        useStaticSigningKey?: boolean,
        userContext?: Record<string, any>
    ): Promise<
        | {
              status: "OK";
              jwt: string;
          }
        | {
              status: "UNSUPPORTED_ALGORITHM_ERROR";
          }
    >;
    static getJWKS(userContext?: Record<string, any>): Promise<{
        keys: import("../jwt").JsonWebKey[];
        validityInSeconds?: number;
    }>;
    static getOpenIdDiscoveryConfiguration(userContext?: Record<string, any>): Promise<{
        status: "OK";
        issuer: string;
        jwks_uri: string;
        authorization_endpoint: string;
        token_endpoint: string;
        userinfo_endpoint: string;
        revocation_endpoint: string;
        token_introspection_endpoint: string;
        end_session_endpoint: string;
        subject_types_supported: string[];
        id_token_signing_alg_values_supported: string[];
        response_types_supported: string[];
    }>;
    static fetchAndSetClaim(
        sessionHandle: string,
        claim: SessionClaim<any>,
        userContext?: Record<string, any>
    ): Promise<boolean>;
    static setClaimValue<T>(
        sessionHandle: string,
        claim: SessionClaim<T>,
        value: T,
        userContext?: Record<string, any>
    ): Promise<boolean>;
    static getClaimValue<T>(
        sessionHandle: string,
        claim: SessionClaim<T>,
        userContext?: Record<string, any>
    ): Promise<
        | {
              status: "SESSION_DOES_NOT_EXIST_ERROR";
          }
        | {
              status: "OK";
              value: T | undefined;
          }
    >;
    static removeClaim(
        sessionHandle: string,
        claim: SessionClaim<any>,
        userContext?: Record<string, any>
    ): Promise<boolean>;
}
export declare let init: typeof Recipe.init;
export declare let createNewSession: typeof SessionWrapper.createNewSession;
export declare let createNewSessionWithoutRequestResponse: typeof SessionWrapper.createNewSessionWithoutRequestResponse;
export declare let getSession: typeof SessionWrapper.getSession;
export declare let getSessionWithoutRequestResponse: typeof SessionWrapper.getSessionWithoutRequestResponse;
export declare let getSessionInformation: typeof SessionWrapper.getSessionInformation;
export declare let refreshSession: typeof SessionWrapper.refreshSession;
export declare let refreshSessionWithoutRequestResponse: typeof SessionWrapper.refreshSessionWithoutRequestResponse;
export declare let revokeAllSessionsForUser: typeof SessionWrapper.revokeAllSessionsForUser;
export declare let getAllSessionHandlesForUser: typeof SessionWrapper.getAllSessionHandlesForUser;
export declare let revokeSession: typeof SessionWrapper.revokeSession;
export declare let revokeMultipleSessions: typeof SessionWrapper.revokeMultipleSessions;
export declare let updateSessionDataInDatabase: typeof SessionWrapper.updateSessionDataInDatabase;
export declare let mergeIntoAccessTokenPayload: typeof SessionWrapper.mergeIntoAccessTokenPayload;
export declare let fetchAndSetClaim: typeof SessionWrapper.fetchAndSetClaim;
export declare let setClaimValue: typeof SessionWrapper.setClaimValue;
export declare let getClaimValue: typeof SessionWrapper.getClaimValue;
export declare let removeClaim: typeof SessionWrapper.removeClaim;
export declare let validateClaimsForSessionHandle: typeof SessionWrapper.validateClaimsForSessionHandle;
export declare let Error: typeof SuperTokensError;
export declare let createJWT: typeof SessionWrapper.createJWT;
export declare let getJWKS: typeof SessionWrapper.getJWKS;
export declare let getOpenIdDiscoveryConfiguration: typeof SessionWrapper.getOpenIdDiscoveryConfiguration;
export type {
    VerifySessionOptions,
    RecipeInterface,
    SessionContainer,
    APIInterface,
    APIOptions,
    SessionInformation,
    SessionClaimValidator,
};
