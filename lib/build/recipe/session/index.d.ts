// @ts-nocheck
import SuperTokensError from "./error";
import {
    VerifySessionOptions,
    RecipeInterface,
    SessionContainerInterface as SessionContainer,
    SessionInformation,
    APIInterface,
    APIOptions,
} from "./types";
import Recipe from "./recipe";
export default class SessionWrapper {
    static init: typeof Recipe.init;
    static Error: typeof SuperTokensError;
    static createNewSession(
        res: any,
        userId: string,
        accessTokenPayload?: any,
        sessionData?: any,
        userContext?: any
    ): Promise<SessionContainer>;
    static getSession(req: any, res: any): Promise<SessionContainer>;
    static getSession(
        req: any,
        res: any,
        options?: VerifySessionOptions & {
            sessionRequired?: true;
        },
        userContext?: any
    ): Promise<SessionContainer>;
    static getSession(
        req: any,
        res: any,
        options?: VerifySessionOptions & {
            sessionRequired: false;
        },
        userContext?: any
    ): Promise<SessionContainer | undefined>;
    static getSessionInformation(sessionHandle: string, userContext?: any): Promise<SessionInformation | undefined>;
    static refreshSession(req: any, res: any, userContext?: any): Promise<SessionContainer>;
    static revokeAllSessionsForUser(userId: string, userContext?: any): Promise<string[]>;
    static getAllSessionHandlesForUser(userId: string, userContext?: any): Promise<string[]>;
    static revokeSession(sessionHandle: string, userContext?: any): Promise<boolean>;
    static revokeMultipleSessions(sessionHandles: string[], userContext?: any): Promise<string[]>;
    static updateSessionData(sessionHandle: string, newSessionData: any, userContext?: any): Promise<boolean>;
    static regenerateAccessToken(
        accessToken: string,
        newAccessTokenPayload?: any,
        userContext?: any
    ): Promise<
        | {
              status: "OK";
              session: {
                  handle: string;
                  userId: string;
                  userDataInJWT: any;
              };
              accessToken?:
                  | {
                        token: string;
                        expiry: number;
                        createdTime: number;
                    }
                  | undefined;
          }
        | undefined
    >;
    static updateAccessTokenPayload(
        sessionHandle: string,
        newAccessTokenPayload: any,
        userContext?: any
    ): Promise<boolean>;
    static createJWT(
        payload?: any,
        validitySeconds?: number,
        userContext?: any
    ): Promise<
        | {
              status: "OK";
              jwt: string;
          }
        | {
              status: "UNSUPPORTED_ALGORITHM_ERROR";
          }
    >;
    static getJWKS(
        userContext?: any
    ): Promise<{
        status: "OK";
        keys: import("../jwt").JsonWebKey[];
    }>;
    static getOpenIdDiscoveryConfiguration(
        userContext?: any
    ): Promise<{
        status: "OK";
        issuer: string;
        jwks_uri: string;
    }>;
}
export declare let init: typeof Recipe.init;
export declare let createNewSession: typeof SessionWrapper.createNewSession;
export declare let getSession: typeof SessionWrapper.getSession;
export declare let getSessionInformation: typeof SessionWrapper.getSessionInformation;
export declare let refreshSession: typeof SessionWrapper.refreshSession;
export declare let revokeAllSessionsForUser: typeof SessionWrapper.revokeAllSessionsForUser;
export declare let getAllSessionHandlesForUser: typeof SessionWrapper.getAllSessionHandlesForUser;
export declare let revokeSession: typeof SessionWrapper.revokeSession;
export declare let revokeMultipleSessions: typeof SessionWrapper.revokeMultipleSessions;
export declare let updateSessionData: typeof SessionWrapper.updateSessionData;
export declare let updateAccessTokenPayload: typeof SessionWrapper.updateAccessTokenPayload;
export declare let Error: typeof SuperTokensError;
export declare let createJWT: typeof SessionWrapper.createJWT;
export declare let getJWKS: typeof SessionWrapper.getJWKS;
export declare let getOpenIdDiscoveryConfiguration: typeof SessionWrapper.getOpenIdDiscoveryConfiguration;
export type { VerifySessionOptions, RecipeInterface, SessionContainer, APIInterface, APIOptions, SessionInformation };
