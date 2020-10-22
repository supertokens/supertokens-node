import OriginalSessionClass from "../sessionClass";
import SessionRecipe from "./sessionRecipe";
import * as express from "express";
export default class Session extends OriginalSessionClass {
    constructor(recipeInstance: SessionRecipe, accessToken: string, sessionHandle: string, userId: string, userDataInJWT: any, accessTokenExpiry: number | undefined, res: express.Response);
    getFaunadbToken: () => Promise<string>;
}
