// @ts-nocheck
import RecipeModule from "./recipeModule";
import NormalisedURLDomain from "./normalisedURLDomain";
import NormalisedURLPath from "./normalisedURLPath";
import type { TypeFramework } from "./framework/types";
import { BaseRequest } from "./framework";
export declare type AppInfo = {
    appName: string;
    origin: string | ((req: BaseRequest, userContext: any) => Promise<string>);
    originBasePath?: string;
    apiDomain: string | ((req: BaseRequest, userContext: any) => Promise<string>);
    apiBasePath?: string;
    apiGatewayPath?: string;
};
export declare type NormalisedAppinfo = {
    appName: string;
    origin: (req: BaseRequest, userContext: any) => Promise<NormalisedURLDomain>;
    apiDomain: (req: BaseRequest, userContext: any) => Promise<NormalisedURLDomain>;
    apiBasePath: NormalisedURLPath;
    apiGatewayPath: NormalisedURLPath;
    originBasePath: NormalisedURLPath;
    initialOriginType: "string" | "function";
    initialAPIDomainType: "string" | "function";
};
export declare type SuperTokensInfo = {
    connectionURI: string;
    apiKey?: string;
};
export declare type TypeInput = {
    supertokens?: SuperTokensInfo;
    framework?: TypeFramework;
    appInfo: AppInfo;
    recipeList: RecipeListFunction[];
    telemetry?: boolean;
    isInServerlessEnv?: boolean;
};
export declare type RecipeListFunction = (appInfo: NormalisedAppinfo, isInServerlessEnv: boolean) => RecipeModule;
export declare type APIHandled = {
    pathWithoutApiBasePath: NormalisedURLPath;
    method: HTTPMethod;
    id: string;
    disabled: boolean;
};
export declare type HTTPMethod = "post" | "get" | "delete" | "put" | "options" | "trace";
export declare type JSONPrimitive = string | number | boolean | null;
export declare type JSONArray = Array<JSONValue>;
export declare type JSONValue = JSONPrimitive | JSONObject | JSONArray | undefined;
export interface JSONObject {
    [ind: string]: JSONValue;
}
export declare type GeneralErrorResponse = {
    status: "GENERAL_ERROR";
    message: string;
};
