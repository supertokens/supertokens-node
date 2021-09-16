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
import type { SessionRequest } from "../../framework/express";
export default class SessionWrapper {
    static init: typeof Recipe.init;
    static Error: typeof SuperTokensError;
    static createNewSession(res: any, userId: string, jwtPayload?: any, sessionData?: any): Promise<SessionContainer>;
    static getSession(req: any, res: any, options?: VerifySessionOptions): Promise<SessionContainer | undefined>;
    static getSessionInformation(sessionHandle: string): Promise<SessionInformation>;
    static refreshSession(req: any, res: any): Promise<SessionContainer>;
    static revokeAllSessionsForUser(userId: string): Promise<string[]>;
    static getAllSessionHandlesForUser(userId: string): Promise<string[]>;
    static revokeSession(sessionHandle: string): Promise<boolean>;
    static revokeMultipleSessions(sessionHandles: string[]): Promise<string[]>;
    /** @deprecated Use getSessionInformation instead IF using core version >= 3.5 **/
    static getSessionData(sessionHandle: string): Promise<any>;
    static updateSessionData(sessionHandle: string, newSessionData: any): Promise<void>;
    /** @deprecated Use getSessionInformation instead IF using core version >= 3.5 **/
    static getJWTPayload(sessionHandle: string): Promise<any>;
    static updateJWTPayload(sessionHandle: string, newJWTPayload: any): Promise<void>;
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
/** @deprecated Use getSessionInformation instead IF using core version >= 3.5 **/
export declare let getSessionData: typeof SessionWrapper.getSessionData;
export declare let updateSessionData: typeof SessionWrapper.updateSessionData;
/** @deprecated Use getSessionInformation instead IF using core version >= 3.5 **/
export declare let getJWTPayload: typeof SessionWrapper.getJWTPayload;
export declare let updateJWTPayload: typeof SessionWrapper.updateJWTPayload;
/**
 * @deprecated
 */
export declare let verifySession: typeof import("./framework/express").verifySession;
export declare let Error: typeof SuperTokensError;
export type {
    VerifySessionOptions,
    RecipeInterface,
    SessionContainer,
    SessionRequest,
    APIInterface,
    APIOptions,
    SessionInformation,
};
