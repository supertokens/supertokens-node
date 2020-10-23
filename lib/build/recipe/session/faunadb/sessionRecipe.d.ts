import OriginalSessionRecipe from "../sessionRecipe";
import * as express from "express";
import { TypeFaunaDBInput } from "./types";
import STError from "../error";
import * as faunadb from "faunadb";
import Session from "./sessionClass";
import RecipeModule from "../../../recipeModule";
import { NormalisedAppinfo, RecipeListFunction } from "../../../types";
import OriginalSessionClass from "../sessionClass";
export default class SessionRecipe extends RecipeModule {
    private static instance;
    parentRecipe: OriginalSessionRecipe;
    config: {
        faunadbSecret: string;
        accessFaunadbTokenFromFrontend: boolean;
        userCollectionName: string;
    };
    superCreateNewSession: (res: express.Response, userId: string, jwtPayload?: any, sessionData?: any) => Promise<OriginalSessionClass>;
    superGetSession: (req: express.Request, res: express.Response, doAntiCsrfCheck: boolean) => Promise<OriginalSessionClass>;
    superRefreshSession: (req: express.Request, res: express.Response) => Promise<OriginalSessionClass>;
    q: typeof faunadb.query;
    faunaDBClient: faunadb.Client;
    constructor(recipeId: string, appInfo: NormalisedAppinfo, config: TypeFaunaDBInput);
    static getInstanceOrThrowError(): SessionRecipe;
    static init(config: TypeFaunaDBInput): RecipeListFunction;
    static reset(): void;
    getAPIsHandled: () => import("../../../types").APIHandled[];
    handleAPIRequest: (id: string, req: express.Request, res: express.Response, next: express.NextFunction) => void;
    handleError: (err: STError, request: express.Request, response: express.Response, next: express.NextFunction) => void;
    getAllCORSHeaders: () => string[];
    getFDAT: (session: Session) => Promise<any>;
    createNewSession: (res: express.Response, userId: string, jwtPayload?: any, sessionData?: any) => Promise<Session>;
    getSession: (req: express.Request, res: express.Response, doAntiCsrfCheck: boolean) => Promise<Session>;
    refreshSession: (req: express.Request, res: express.Response) => Promise<Session>;
}
