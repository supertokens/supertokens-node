import { APIHandled } from "../../../types";
import ThirdPartyRecipe from "../recipe";
import * as express from "express";
export default abstract class ThirdPartyProvider {
    protected abstract id: string;
    private recipe;
    constructor(recipe: ThirdPartyRecipe);
    abstract getAPIsHandled(): APIHandled[];
    abstract handleAPIRequest(id: string, req: express.Request, response: express.Response, next: express.NextFunction): Promise<void>;
    protected abstract getAuthorizationURL(id: string, req: express.Request, response: express.Response, next: express.NextFunction): Promise<void>;
    protected abstract verifyCodeAndGetTokens(id: string, req: express.Request, response: express.Response, next: express.NextFunction): Promise<void>;
}
