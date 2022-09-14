// @ts-nocheck
import RecipeModule from "./recipeModule";
import NormalisedURLDomain from "./normalisedURLDomain";
import NormalisedURLPath from "./normalisedURLPath";
import { TypeFramework } from "./framework/types";
export declare type AppInfo = {
    appName: string;
    websiteDomain: string;
    websiteBasePath?: string;
    apiDomain: string;
    apiBasePath?: string;
    apiGatewayPath?: string;
};
export declare type NormalisedAppinfo = {
    appName: string;
    websiteDomain: NormalisedURLDomain;
    apiDomain: NormalisedURLDomain;
    apiBasePath: NormalisedURLPath;
    apiGatewayPath: NormalisedURLPath;
    websiteBasePath: NormalisedURLPath;
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
