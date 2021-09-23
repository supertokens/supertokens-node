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
export declare type TypeInput = {
    supertokens?: {
        connectionURI: string;
        apiKey?: string;
    };
    framework?: TypeFramework;
    appInfo: AppInfo;
    recipeList: RecipeListFunction[];
    telemetry?: boolean;
    isInServerlessEnv?: boolean;
};
export declare const InputSchema: {
    type: string;
    properties: {
        framework: {
            type: string;
            enum: string[];
        };
        supertokens: {
            type: string;
            properties: {
                connectionURI: {
                    type: string;
                };
                apiKey: {
                    type: string;
                };
            };
            required: string[];
            additionalProperties: boolean;
        };
        appInfo: {
            type: string;
            properties: {
                appName: {
                    type: string;
                };
                websiteDomain: {
                    type: string;
                };
                apiDomain: {
                    type: string;
                };
                apiBasePath: {
                    type: string;
                };
                apiGatewayPath: {
                    type: string;
                };
                websiteBasePath: {
                    type: string;
                };
            };
            required: string[];
            additionalProperties: boolean;
        };
        recipeList: {
            type: string;
        };
        telemetry: {
            type: string;
        };
        isInServerlessEnv: {
            type: string;
        };
    };
    required: string[];
    additionalProperties: boolean;
};
export declare type RecipeListFunction = (appInfo: NormalisedAppinfo, isInServerlessEnv: boolean) => RecipeModule;
export declare type APIHandled = {
    pathWithoutApiBasePath: NormalisedURLPath;
    method: HTTPMethod;
    id: string;
    disabled: boolean;
};
export declare type HTTPMethod = "post" | "get" | "delete" | "put" | "options" | "trace";
