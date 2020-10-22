import OriginalSessionRecipe from "../sessionRecipe";
import * as express from "express";
import { TypeFaunaDBInput } from "./types";
import Session from "./sessionClass";
import { NormalisedAppinfo, RecipeListFunction } from "../../../types";
export declare const FAUNADB_TOKEN_TIME_LAG_MILLI: number;
export declare const FAUNADB_SESSION_KEY = "faunadbToken";
export default class SessionRecipe extends OriginalSessionRecipe {
    private static faunaSessionRecipeInstance;
    faunaConfig: {
        faunadbSecret: string;
        accessFaunadbTokenFromFrontend: boolean;
        userCollectionName: string;
    };
    constructor(recipeId: string, appInfo: NormalisedAppinfo, config: TypeFaunaDBInput);
    static getInstanceOrThrowError(): SessionRecipe;
    static init(config: TypeFaunaDBInput): RecipeListFunction;
    static reset(): void;
    getFDAT: (session: Session) => Promise<any>;
    createNewSession: (res: express.Response, userId: string, jwtPayload?: any, sessionData?: any) => Promise<Session>;
    getSession: (req: express.Request, res: express.Response, doAntiCsrfCheck: boolean) => Promise<Session>;
    refreshSession: (req: express.Request, res: express.Response) => Promise<Session>;
}
