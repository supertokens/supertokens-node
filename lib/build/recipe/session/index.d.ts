import SessionRecipe from "./recipe";
import * as express from "express";
import SuperTokensError from "./error";
import {
    VerifySessionOptions,
    RecipeInterface,
    SessionContainerInterface as SessionContainer,
    SessionRequest,
} from "./types";
export default class SessionWrapper {
    static init: typeof SessionRecipe.init;
    static Error: typeof SuperTokensError;
    static createNewSession(
        res: express.Response,
        userId: string,
        jwtPayload?: any,
        sessionData?: any
    ): Promise<SessionContainer>;
    static getSession(
        req: express.Request,
        res: express.Response,
        options?: VerifySessionOptions
    ): Promise<SessionContainer | undefined>;
    static refreshSession(req: express.Request, res: express.Response): Promise<SessionContainer>;
    static revokeAllSessionsForUser(userId: string): Promise<string[]>;
    static getAllSessionHandlesForUser(userId: string): Promise<string[]>;
    static revokeSession(sessionHandle: string): Promise<boolean>;
    static revokeMultipleSessions(sessionHandles: string[]): Promise<string[]>;
    static getSessionData(sessionHandle: string): Promise<any>;
    static updateSessionData(sessionHandle: string, newSessionData: any): Promise<void>;
    static getJWTPayload(sessionHandle: string): Promise<any>;
    static updateJWTPayload(sessionHandle: string, newJWTPayload: any): Promise<void>;
    static verifySession: (
        options?: VerifySessionOptions | undefined
    ) => (req: express.Request, res: express.Response, next: express.NextFunction) => Promise<void>;
}
export declare let init: typeof SessionRecipe.init;
export declare let createNewSession: typeof SessionWrapper.createNewSession;
export declare let getSession: typeof SessionWrapper.getSession;
export declare let refreshSession: typeof SessionWrapper.refreshSession;
export declare let revokeAllSessionsForUser: typeof SessionWrapper.revokeAllSessionsForUser;
export declare let getAllSessionHandlesForUser: typeof SessionWrapper.getAllSessionHandlesForUser;
export declare let revokeSession: typeof SessionWrapper.revokeSession;
export declare let revokeMultipleSessions: typeof SessionWrapper.revokeMultipleSessions;
export declare let getSessionData: typeof SessionWrapper.getSessionData;
export declare let updateSessionData: typeof SessionWrapper.updateSessionData;
export declare let getJWTPayload: typeof SessionWrapper.getJWTPayload;
export declare let updateJWTPayload: typeof SessionWrapper.updateJWTPayload;
export declare let verifySession: (
    options?: VerifySessionOptions | undefined
) => (req: express.Request, res: express.Response, next: express.NextFunction) => Promise<void>;
export declare let Error: typeof SuperTokensError;
export type { VerifySessionOptions, RecipeInterface, SessionContainer, SessionRequest };
