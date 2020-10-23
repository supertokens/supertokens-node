import RecipeModule from "../../recipeModule";
import { TypeInput, SessionRequest } from "./types";
import STError from "./error";
import Session from "./sessionClass";
import { HandshakeInfo, NormalisedErrorHandlers } from "./types";
import * as express from "express";
import { NormalisedAppinfo, RecipeListFunction, APIHandled } from "../../types";
export default class SessionRecipe extends RecipeModule {
    private static instance;
    static RECIPE_ID: string;
    config: {
        accessTokenPath: string;
        refreshTokenPath: string;
        cookieDomain: string | undefined;
        cookieSecure: boolean;
        cookieSameSite: "strict" | "lax" | "none";
        sessionExpiredStatusCode: number;
        sessionRefreshFeature: {
            disableDefaultImplementation: boolean;
        };
        errorHandlers: NormalisedErrorHandlers;
    };
    handshakeInfo: HandshakeInfo | undefined;
    constructor(recipeId: string, appInfo: NormalisedAppinfo, config: TypeInput);
    static getInstanceOrThrowError(): SessionRecipe;
    static init(config: TypeInput): RecipeListFunction;
    static reset(): void;
    getAPIsHandled: () => APIHandled[];
    handleAPIRequest: (id: string, req: express.Request, res: express.Response, next: express.NextFunction) => void;
    handleError: (err: STError, request: express.Request, response: express.Response, next: express.NextFunction) => void;
    getHandshakeInfo: () => Promise<HandshakeInfo>;
    updateJwtSigningPublicKeyInfo: (newKey: string, newExpiry: number) => void;
    createNewSession: (res: express.Response, userId: string, jwtPayload?: any, sessionData?: any) => Promise<Session>;
    getSession: (req: express.Request, res: express.Response, doAntiCsrfCheck: boolean) => Promise<Session>;
    refreshSession: (req: express.Request, res: express.Response) => Promise<Session>;
    revokeAllSessionsForUser: (userId: string) => Promise<string[]>;
    getAllSessionHandlesForUser: (userId: string) => Promise<string[]>;
    revokeSession: (sessionHandle: string) => Promise<boolean>;
    revokeMultipleSessions: (sessionHandles: string[]) => Promise<string[]>;
    getSessionData: (sessionHandle: string) => Promise<any>;
    updateSessionData: (sessionHandle: string, newSessionData: any) => Promise<void>;
    getCORSAllowedHeaders: () => string[];
    getJWTPayload: (sessionHandle: string) => Promise<any>;
    updateJWTPayload: (sessionHandle: string, newJWTPayload: any) => Promise<void>;
    auth0Handler: (request: SessionRequest, response: express.Response, next: express.NextFunction, domain: string, clientId: string, clientSecret: string, callback?: ((userId: string, idToken: string, accessToken: string, refreshToken: string | undefined) => Promise<void>) | undefined) => Promise<express.Response | undefined>;
}
