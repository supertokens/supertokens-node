import { VerifySessionOptions, RecipeInterface } from "../";
import * as express from "express";
import * as faunadb from "faunadb";
import { Session as FaunaDBSessionContainer } from "./types";
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
    createNewSession: (
        res: express.Response,
        userId: string,
        jwtPayload?: any,
        sessionData?: any
    ) => Promise<FaunaDBSessionContainer>;
    getSession: (
        req: express.Request,
        res: express.Response,
        options?: VerifySessionOptions | undefined
    ) => Promise<FaunaDBSessionContainer | undefined>;
    refreshSession: (req: express.Request, res: express.Response) => Promise<FaunaDBSessionContainer>;
    revokeAllSessionsForUser: (userId: string) => Promise<string[]>;
    getAllSessionHandlesForUser: (userId: string) => Promise<string[]>;
    revokeSession: (sessionHandle: string) => Promise<boolean>;
    revokeMultipleSessions: (sessionHandles: string[]) => Promise<string[]>;
    getSessionData: (sessionHandle: string) => Promise<any>;
    updateSessionData: (sessionHandle: string, newSessionData: any) => Promise<void>;
    getJWTPayload: (sessionHandle: string) => Promise<any>;
    updateJWTPayload: (sessionHandle: string, newJWTPayload: any) => Promise<void>;
    getAccessTokenLifeTimeMS: () => Promise<number>;
    getRefreshTokenLifeTimeMS: () => Promise<number>;
}
