/// <reference types="express" />
import SessionRecipe from "./sessionRecipe";
import STError from "./error";
export * from "./error";
export * from "./sessionClass";
export default class SessionWrapper {
    static init: typeof SessionRecipe.init;
    static createNewSession: (res: import("express").Response, userId: string, jwtPayload?: any, sessionData?: any) => Promise<import("./sessionClass").default>;
    static getSession: (req: import("express").Request, res: import("express").Response, doAntiCsrfCheck: boolean) => Promise<import("./sessionClass").default>;
    static refreshSession: (req: import("express").Request, res: import("express").Response) => Promise<import("./sessionClass").default>;
    static revokeAllSessionsForUser: (userId: string) => Promise<string[]>;
    static getAllSessionHandlesForUser: (userId: string) => Promise<string[]>;
    static revokeSession: (sessionHandle: string) => Promise<boolean>;
    static revokeMultipleSessions: (sessionHandles: string[]) => Promise<string[]>;
    static getSessionData: (sessionHandle: string) => Promise<any>;
    static updateSessionData: (sessionHandle: string, newSessionData: any) => Promise<void>;
    static getJWTPayload: (sessionHandle: string) => Promise<any>;
    static updateJWTPayload: (sessionHandle: string, newJWTPayload: any) => Promise<void>;
    static auth0Handler: (request: import("./types").SessionRequest, response: import("express").Response, next: import("express").NextFunction, domain: string, clientId: string, clientSecret: string, callback?: ((userId: string, idToken: string, accessToken: string, refreshToken: string | undefined) => Promise<void>) | undefined) => Promise<import("express").Response | undefined>;
    static middleware: (antiCsrfCheck?: boolean | undefined) => (request: import("./types").SessionRequest, response: import("express").Response, next: import("express").NextFunction) => Promise<void>;
    static Error: typeof STError;
}
export declare let init: typeof SessionRecipe.init;
export declare let createNewSession: (res: import("express").Response, userId: string, jwtPayload?: any, sessionData?: any) => Promise<import("./sessionClass").default>;
export declare let getSession: (req: import("express").Request, res: import("express").Response, doAntiCsrfCheck: boolean) => Promise<import("./sessionClass").default>;
export declare let refreshSession: (req: import("express").Request, res: import("express").Response) => Promise<import("./sessionClass").default>;
export declare let revokeAllSessionsForUser: (userId: string) => Promise<string[]>;
export declare let getAllSessionHandlesForUser: (userId: string) => Promise<string[]>;
export declare let revokeSession: (sessionHandle: string) => Promise<boolean>;
export declare let revokeMultipleSessions: (sessionHandles: string[]) => Promise<string[]>;
export declare let getSessionData: (sessionHandle: string) => Promise<any>;
export declare let updateSessionData: (sessionHandle: string, newSessionData: any) => Promise<void>;
export declare let getJWTPayload: (sessionHandle: string) => Promise<any>;
export declare let updateJWTPayload: (sessionHandle: string, newJWTPayload: any) => Promise<void>;
export declare let auth0Handler: (request: import("./types").SessionRequest, response: import("express").Response, next: import("express").NextFunction, domain: string, clientId: string, clientSecret: string, callback?: ((userId: string, idToken: string, accessToken: string, refreshToken: string | undefined) => Promise<void>) | undefined) => Promise<import("express").Response | undefined>;
export declare let middleware: (antiCsrfCheck?: boolean | undefined) => (request: import("./types").SessionRequest, response: import("express").Response, next: import("express").NextFunction) => Promise<void>;
