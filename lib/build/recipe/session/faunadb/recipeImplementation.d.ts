import { VerifySessionOptions, RecipeInterface } from "../";
import * as express from "express";
import * as faunadb from "faunadb";
import { Session as FaunaDBSessionContainer } from "./types";
import { SessionInformation } from "../types";
export default class RecipeImplementation implements RecipeInterface {
    config: {
        accessFaunadbTokenFromFrontend: boolean;
        userCollectionName: string;
        faunaDBClient: faunadb.Client;
    };
    q: typeof faunadb.query;
    originalImplementation: RecipeInterface;
    constructor(
        originalImplementation: RecipeInterface,
        config: {
            accessFaunadbTokenFromFrontend?: boolean;
            userCollectionName: string;
            faunaDBClient: faunadb.Client;
        }
    );
    getFDAT: (userId: string) => Promise<any>;
    createNewSession: ({
        res,
        userId,
        jwtPayload,
        sessionData,
    }: {
        res: express.Response;
        userId: string;
        jwtPayload?: any;
        sessionData?: any;
    }) => Promise<FaunaDBSessionContainer>;
    getSession: ({
        req,
        res,
        options,
    }: {
        req: express.Request;
        res: express.Response;
        options?: VerifySessionOptions | undefined;
    }) => Promise<FaunaDBSessionContainer | undefined>;
    getSessionInformation: ({ sessionHandle }: { sessionHandle: string }) => Promise<SessionInformation>;
    refreshSession: ({ req, res }: { req: express.Request; res: express.Response }) => Promise<FaunaDBSessionContainer>;
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
    getJWTPayload: (input: { sessionHandle: string }) => Promise<any>;
    updateJWTPayload: (input: { sessionHandle: string; newJWTPayload: any }) => Promise<void>;
    getAccessTokenLifeTimeMS: () => Promise<number>;
    getRefreshTokenLifeTimeMS: () => Promise<number>;
}
