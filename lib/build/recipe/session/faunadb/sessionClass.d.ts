import OriginalSessionClass from "../sessionClass";
import * as express from "express";
import OriginalSessionRecipe from "../sessionRecipe";
export default class Session extends OriginalSessionClass {
    constructor(recipeInstance: OriginalSessionRecipe, accessToken: string, sessionHandle: string, userId: string, userDataInJWT: any, accessTokenExpiry: number | undefined, res: express.Response);
    getFaunadbToken: () => Promise<string>;
}
