import { CreateOrRefreshAPIResponse, TypeInput, TypeNormalisedInput } from "./types";
import * as express from "express";
import SessionRecipe from "./recipe";
import { NormalisedAppinfo } from "../../types";
export declare function normaliseSessionScopeOrThrowError(sessionScope: string): string;
export declare function getTopLevelDomainForSameSiteResolution(url: string): string;
export declare function validateAndNormaliseUserInput(
    recipeInstance: SessionRecipe,
    appInfo: NormalisedAppinfo,
    config?: TypeInput
): TypeNormalisedInput;
export declare function normaliseSameSiteOrThrowError(sameSite: string): "strict" | "lax" | "none";
export declare function attachCreateOrRefreshSessionResponseToExpressRes(
    config: TypeNormalisedInput,
    res: express.Response,
    response: CreateOrRefreshAPIResponse
): void;
