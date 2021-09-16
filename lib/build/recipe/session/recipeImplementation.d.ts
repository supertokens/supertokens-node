// @ts-nocheck
import { RecipeInterface, VerifySessionOptions, TypeNormalisedInput, HandshakeInfo, SessionInformation } from "./types";
import Session from "./sessionClass";
import { Querier } from "../../querier";
export default class RecipeImplementation implements RecipeInterface {
    querier: Querier;
    config: TypeNormalisedInput;
    handshakeInfo: HandshakeInfo | undefined;
    isInServerlessEnv: boolean;
    constructor(querier: Querier, config: TypeNormalisedInput, isInServerlessEnv: boolean);
    createNewSession: ({
        res,
        userId,
        jwtPayload,
        sessionData,
    }: {
        res: any;
        userId: string;
        jwtPayload?: any;
        sessionData?: any;
    }) => Promise<Session>;
    getSession: ({
        req,
        res,
        options,
    }: {
        req: any;
        res: any;
        options?: VerifySessionOptions | undefined;
    }) => Promise<Session | undefined>;
    getSessionInformation: ({ sessionHandle }: { sessionHandle: string }) => Promise<SessionInformation>;
    refreshSession: ({ req, res }: { req: any; res: any }) => Promise<Session>;
    revokeAllSessionsForUser: ({ userId }: { userId: string }) => Promise<string[]>;
    getAllSessionHandlesForUser: ({ userId }: { userId: string }) => Promise<string[]>;
    revokeSession: ({ sessionHandle }: { sessionHandle: string }) => Promise<boolean>;
    revokeMultipleSessions: ({ sessionHandles }: { sessionHandles: string[] }) => Promise<string[]>;
    getSessionData: ({ sessionHandle }: { sessionHandle: string }) => Promise<any>;
    updateSessionData: ({
        sessionHandle,
        newSessionData,
    }: {
        sessionHandle: string;
        newSessionData: any;
    }) => Promise<void>;
    getJWTPayload: ({ sessionHandle }: { sessionHandle: string }) => Promise<any>;
    updateJWTPayload: ({
        sessionHandle,
        newJWTPayload,
    }: {
        sessionHandle: string;
        newJWTPayload: any;
    }) => Promise<void>;
    getHandshakeInfo: (forceRefetch?: boolean) => Promise<HandshakeInfo>;
    updateJwtSigningPublicKeyInfo: (newKey: string, newExpiry: number) => void;
    getAccessTokenLifeTimeMS: () => Promise<number>;
    getRefreshTokenLifeTimeMS: () => Promise<number>;
}
