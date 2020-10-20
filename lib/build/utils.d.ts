import { CreateOrRefreshAPIResponse } from "./types";
import * as express from "express";
export declare function validateAndNormaliseCookieSameSite(sameSite: string): "strict" | "lax" | "none";
export declare function attachCreateOrRefreshSessionResponseToExpressRes(res: express.Response, response: CreateOrRefreshAPIResponse): void;
export declare function getLargestVersionFromIntersection(v1: string[], v2: string[]): string | undefined;
export declare function maxVersion(version1: string, version2: string): string;
