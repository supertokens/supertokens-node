import { RecipeInterface, VerifySessionOptions, TypeNormalisedInput, HandshakeInfo } from "./types";
import * as express from "express";
import Session from "./sessionClass";
import { Querier } from "../../querier";
export default class RecipeImplementation implements RecipeInterface {
    querier: Querier;
    config: TypeNormalisedInput;
    handshakeInfo: HandshakeInfo | undefined;
    isInServerlessEnv: boolean;
    constructor(querier: Querier, config: TypeNormalisedInput, isInServerlessEnv: boolean);
    createNewSession: (res: express.Response, userId: string, jwtPayload?: any, sessionData?: any) => Promise<Session>;
    getSession: (
        req: express.Request,
        res: express.Response,
        options?: VerifySessionOptions | undefined
    ) => Promise<Session | undefined>;
    refreshSession: (req: express.Request, res: express.Response) => Promise<Session>;
    revokeAllSessionsForUser: (userId: string) => Promise<string[]>;
    getAllSessionHandlesForUser: (userId: string) => Promise<string[]>;
    revokeSession: (sessionHandle: string) => Promise<boolean>;
    revokeMultipleSessions: (sessionHandles: string[]) => Promise<string[]>;
    getSessionData: (sessionHandle: string) => Promise<any>;
    updateSessionData: (sessionHandle: string, newSessionData: any) => Promise<void>;
    getJWTPayload: (sessionHandle: string) => Promise<any>;
    updateJWTPayload: (sessionHandle: string, newJWTPayload: any) => Promise<void>;
    getHandshakeInfo: () => Promise<HandshakeInfo>;
    updateJwtSigningPublicKeyInfo: (newKey: string, newExpiry: number) => void;
}
