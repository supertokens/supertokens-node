import OriginalSessionClass from "../sessionClass";
import * as express from "express";
import OriginalSessionRecipe from "../recipe";
export default class Session extends OriginalSessionClass {
    constructor(
        recipeInstance: OriginalSessionRecipe,
        accessToken: string,
        sessionHandle: string,
        userId: string,
        userDataInJWT: any,
        res: express.Response
    );
    getFaunadbToken: () => Promise<string>;
}
