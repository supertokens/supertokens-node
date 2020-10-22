import { CreateOrRefreshAPIResponse, TypeInput, TypeNormalisedInput } from "./types";
import * as express from "express";
export declare function normaliseSessionScopeOrThrowError(sessionScope: string): string;
export declare function validateAndNormaliseUserInput(config: TypeInput): TypeNormalisedInput;
export declare function normaliseSameSiteOrThrowError(sameSite: string): "strict" | "lax" | "none";
export declare function attachCreateOrRefreshSessionResponseToExpressRes(res: express.Response, response: CreateOrRefreshAPIResponse): void;
