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
    static createNewSession(res: any, userId: string, accessTokenPayload?: any, sessionData?: any): any;
    static getSession(req: any, res: any, options?: VerifySessionOptions): any;
    static getSessionInformation(sessionHandle: string): any;
    static refreshSession(req: any, res: any): any;
    static revokeAllSessionsForUser(userId: string): any;
    static getAllSessionHandlesForUser(userId: string): any;
    static revokeSession(sessionHandle: string): any;
    static revokeMultipleSessions(sessionHandles: string[]): any;
    static updateSessionData(sessionHandle: string, newSessionData: any): any;
    static updateAccessTokenPayload(sessionHandle: string, newAccessTokenPayload: any): any;
    static createJWT(payload?: any, validitySeconds?: number): any;
    static getJWKS(): any;
    static getOpenIdDiscoveryConfiguration(): any;
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
