import RecipeModule from "../../recipeModule";
import { TypeInput, TypeNormalisedInput, RecipeInterface } from "./types";
import STError from "./error";
import { HandshakeInfo } from "./types";
import * as express from "express";
import { NormalisedAppinfo, RecipeListFunction, APIHandled, HTTPMethod } from "../../types";
import NormalisedURLPath from "../../normalisedURLPath";
export default class SessionRecipe extends RecipeModule {
    private static instance;
    static RECIPE_ID: string;
    config: TypeNormalisedInput;
    handshakeInfo: HandshakeInfo | undefined;
    recipeInterfaceImpl: RecipeInterface;
    constructor(recipeId: string, appInfo: NormalisedAppinfo, isInServerlessEnv: boolean, config?: TypeInput);
    static getInstanceOrThrowError(): SessionRecipe;
    static init(config?: TypeInput): RecipeListFunction;
    static reset(): void;
    getAPIsHandled: () => APIHandled[];
    handleAPIRequest: (
        id: string,
        req: express.Request,
        res: express.Response,
        next: express.NextFunction,
        __: NormalisedURLPath,
        ___: HTTPMethod
    ) => Promise<void>;
    handleError: (
        err: STError,
        request: express.Request,
        response: express.Response,
        next: express.NextFunction
    ) => void;
    getAllCORSHeaders: () => string[];
    isErrorFromThisRecipe: (err: any) => err is STError;
    getHandshakeInfo: () => Promise<HandshakeInfo>;
    updateJwtSigningPublicKeyInfo: (newKey: string, newExpiry: number) => void;
}
