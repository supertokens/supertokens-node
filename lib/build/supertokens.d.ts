import { TypeInput, NormalisedAppinfo } from "./types";
import RecipeModule from "./recipeModule";
import * as express from "express";
export default class SuperTokens {
    private static instance;
    appInfo: NormalisedAppinfo;
    recipeModules: RecipeModule[];
    constructor(config: TypeInput);
    sendTelemetry: () => Promise<void>;
    static init(config: TypeInput): void;
    static reset(): void;
    static getInstanceOrThrowError(): SuperTokens;
    middleware: () => (request: express.Request, response: express.Response, next: express.NextFunction) => Promise<void>;
    handleAPI: (matchedRecipe: RecipeModule, id: string, request: express.Request, response: express.Response, next: express.NextFunction) => Promise<void>;
    errorHandler: () => (err: any, request: express.Request, response: express.Response, next: express.NextFunction) => Promise<void>;
    getAllCORSHeaders: () => string[];
}
