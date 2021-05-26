import OriginalSessionClass from "../sessionClass";
import * as express from "express";
import OriginalSessionRecipe from "../recipeImplementation";
export default class Session extends OriginalSessionClass {
    constructor(
        recipeImplementation: OriginalSessionRecipe,
        accessToken: string,
        sessionHandle: string,
        userId: string,
        userDataInJWT: any,
        res: express.Response,
        req: express.Request
    );
    getFaunadbToken: () => Promise<string>;
}
