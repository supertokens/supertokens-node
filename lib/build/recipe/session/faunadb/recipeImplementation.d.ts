import { VerifySessionOptions, RecipeInterface } from "../";
import * as express from "express";
import Session from "./sessionClass";
import * as faunadb from "faunadb";
import { RecipeImplementation as OriginalRecipeImplementation } from "../";
export default class RecipeImplementation implements RecipeInterface {
    config: {
        accessFaunadbTokenFromFrontend: boolean;
        userCollectionName: string;
        faunaDBClient: faunadb.Client;
    };
    q: typeof faunadb.query;
    originalImplementation: OriginalRecipeImplementation;
    constructor(
        originalImplementation: OriginalRecipeImplementation,
        config: {
            accessFaunadbTokenFromFrontend?: boolean;
            userCollectionName: string;
            faunaDBClient: faunadb.Client;
        }
    );
    getFDAT: (session: Session) => Promise<any>;
    createNewSession: (
        req: express.Request,
        res: express.Response,
        userId: string,
        jwtPayload?: any,
        sessionData?: any
    ) => Promise<Session>;
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
}
