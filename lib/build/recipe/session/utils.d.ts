import { CreateOrRefreshAPIResponse, TypeInput, TypeNormalisedInput } from "./types";
import * as express from "express";
import SessionRecipe from "./sessionRecipe";
export declare function normaliseSessionScopeOrThrowError(rId: string, sessionScope: string): string;
export declare function validateAndNormaliseUserInput(recipeInstance: SessionRecipe, config?: TypeInput): TypeNormalisedInput;
export declare function normaliseSameSiteOrThrowError(rId: string, sameSite: string): "strict" | "lax" | "none";
export declare function attachCreateOrRefreshSessionResponseToExpressRes(recipeInstance: SessionRecipe, res: express.Response, response: CreateOrRefreshAPIResponse): void;
