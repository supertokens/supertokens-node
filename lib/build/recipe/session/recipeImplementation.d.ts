import { RecipeInterface, VerifySessionOptions } from "./types";
import Recipe from "./sessionRecipe";
import * as express from "express";
import Session from "./sessionClass";
export default class RecipeImplementation implements RecipeInterface {
    recipeInstance: Recipe;
    constructor(recipeInstance: Recipe);
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
}
