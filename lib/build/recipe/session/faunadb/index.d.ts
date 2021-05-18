import { VerifySessionOptions } from "../types";
import Recipe from "../sessionRecipe";
import OriginalRecipeImplementation from "../recipeImplementation";
import * as express from "express";
import Session from "./sessionClass";
import * as faunadb from "faunadb";
export default class RecipeImplementation extends OriginalRecipeImplementation {
    config: {
        accessFaunadbTokenFromFrontend: boolean;
        userCollectionName: string;
        faunaDBClient: faunadb.Client;
    };
    q: typeof faunadb.query;
    constructor(
        recipeInstance: Recipe,
        config: {
            accessFaunadbTokenFromFrontend?: boolean;
            userCollectionName: string;
            faunadbClient: faunadb.Client;
        }
    );
    getFDAT: (session: Session) => Promise<any>;
    createNewSession: (res: express.Response, userId: string, jwtPayload?: any, sessionData?: any) => Promise<Session>;
    getSession: (
        req: express.Request,
        res: express.Response,
        options?: VerifySessionOptions | undefined
    ) => Promise<Session | undefined>;
    refreshSession: (req: express.Request, res: express.Response) => Promise<Session>;
}
