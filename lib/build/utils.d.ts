import { AppInfo, NormalisedAppinfo, HTTPMethod } from "./types";
import * as express from "express";
export declare function getLargestVersionFromIntersection(v1: string[], v2: string[]): string | undefined;
export declare function maxVersion(version1: string, version2: string): string;
export declare function normaliseInputAppInfoOrThrowError(rId: string, appInfo: AppInfo): NormalisedAppinfo;
export declare function getRIDFromRequest(req: express.Request): string | undefined;
export declare function normaliseHttpMethod(method: string): HTTPMethod;
export declare function getHeader(req: express.Request, key: string): string | undefined;
