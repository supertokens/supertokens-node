import RecipeModule from "../../recipeModule";
import { TypeInput, SessionRequest } from "./types";
import Session from "./sessionClass";
import { HandshakeInfo } from "./types";
import * as express from "express";
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
    };
    handshakeInfo: HandshakeInfo | undefined;
    constructor(recipeId: string, config: TypeInput);
    static init(config: TypeInput): void;
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
