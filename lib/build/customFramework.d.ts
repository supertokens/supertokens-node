// @ts-nocheck
/**
 * This file has definition of various re-usable util methods
 * that can be used to easily integrate the SDK with most
 * frameworks if they are not directly supported.
 */
import { PreParsedRequest } from "./framework/custom";
export declare type HTTPMethod = "post" | "get" | "delete" | "put" | "options" | "trace";
export declare function createPreParsedRequest(request: Request): PreParsedRequest;
