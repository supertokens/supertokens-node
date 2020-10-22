import { CreateOrRefreshAPIResponse, TypeInput, TypeNormalisedInput } from "./types";
import * as express from "express";
import SessionRecipe from "./sessionRecipe";
export declare function normaliseSessionScopeOrThrowError(sessionScope: string): string;
export declare function validateAndNormaliseUserInput(config: TypeInput): TypeNormalisedInput;
export declare function normaliseSameSiteOrThrowError(sameSite: string): "strict" | "lax" | "none";
export declare function attachCreateOrRefreshSessionResponseToExpressRes(recipeInstance: SessionRecipe, res: express.Response, response: CreateOrRefreshAPIResponse): void;
