import { CreateOrRefreshAPIResponse, TypeInput, TypeNormalisedInput } from "./types";
import * as express from "express";
import SessionRecipe from "./sessionRecipe";
import { NormalisedAppinfo } from "../../types";
export declare function normaliseSessionScopeOrThrowError(rId: string, sessionScope: string): string;
export declare function validateAndNormaliseUserInput(recipeInstance: SessionRecipe, appInfo: NormalisedAppinfo, config?: TypeInput): TypeNormalisedInput;
export declare function normaliseSameSiteOrThrowError(rId: string, sameSite: string): "strict" | "lax" | "none";
export declare function attachCreateOrRefreshSessionResponseToExpressRes(recipeInstance: SessionRecipe, res: express.Response, response: CreateOrRefreshAPIResponse): void;
export declare function getEnableAntiCsrfBoolean(recipeInstance: SessionRecipe): Promise<boolean>;
