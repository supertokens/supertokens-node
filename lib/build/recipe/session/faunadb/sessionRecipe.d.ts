import OriginalSessionRecipe from "../sessionRecipe";
import * as express from "express";
import { TypeFaunaDBInput } from "./types";
import STError from "../error";
import * as faunadb from "faunadb";
import Session from "./sessionClass";
import RecipeModule from "../../../recipeModule";
import { NormalisedAppinfo, RecipeListFunction, HTTPMethod } from "../../../types";
import OriginalSessionClass from "../sessionClass";
import NormalisedURLPath from "../../../normalisedURLPath";
export default class SessionRecipe extends RecipeModule {
    private static instance;
    parentRecipe: OriginalSessionRecipe;
    config: {
        accessFaunadbTokenFromFrontend: boolean;
        userCollectionName: string;
    };
    superCreateNewSession: (res: express.Response, userId: string, jwtPayload?: any, sessionData?: any) => Promise<OriginalSessionClass>;
    superGetSession: (req: express.Request, res: express.Response, doAntiCsrfCheck?: boolean) => Promise<OriginalSessionClass>;
    superRefreshSession: (req: express.Request, res: express.Response) => Promise<OriginalSessionClass>;
    q: typeof faunadb.query;
    faunaDBClient: faunadb.Client;
    constructor(recipeId: string, appInfo: NormalisedAppinfo, isInServerlessEnv: boolean, config: TypeFaunaDBInput);
    static getInstanceOrThrowError(): SessionRecipe;
    static init(config: TypeFaunaDBInput): RecipeListFunction;
    static reset(): void;
    getAPIsHandled: () => import("../../../types").APIHandled[];
    handleAPIRequest: (id: string, req: express.Request, res: express.Response, next: express.NextFunction, path: NormalisedURLPath, method: HTTPMethod) => Promise<void>;
    handleError: (err: STError, request: express.Request, response: express.Response, next: express.NextFunction) => void;
    getAllCORSHeaders: () => string[];
    isErrorFromThisOrChildRecipeBasedOnInstance: (err: any) => err is STError;
    getFDAT: (session: Session) => Promise<any>;
    createNewSession: (res: express.Response, userId: string, jwtPayload?: any, sessionData?: any) => Promise<Session>;
    getSession: (req: express.Request, res: express.Response, doAntiCsrfCheck?: boolean | undefined) => Promise<Session>;
    refreshSession: (req: express.Request, res: express.Response) => Promise<Session>;
}
