import { AppInfo, NormalisedAppinfo } from "./types";
export declare function normaliseURLPathOrThrowError(input: string): string;
export declare function normaliseURLDomainOrThrowError(input: string): string;
export declare function getLargestVersionFromIntersection(v1: string[], v2: string[]): string | undefined;
export declare function maxVersion(version1: string, version2: string): string;
export declare function normaliseInputAppInfo(appInfo: AppInfo): NormalisedAppinfo;
