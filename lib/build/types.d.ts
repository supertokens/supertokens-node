// @ts-nocheck
import RecipeModule from "./recipeModule";
import NormalisedURLDomain from "./normalisedURLDomain";
import NormalisedURLPath from "./normalisedURLPath";
import { TypeFramework } from "./framework/types";
import { RecipeLevelUser } from "./recipe/accountlinking/types";
import { BaseRequest } from "./framework";
declare const __brand: unique symbol;
declare type Brand<B> = {
    [__brand]: B;
};
declare type Branded<T, B> = T & Brand<B>;
export declare type NonNullableProperties<T> = {
    [P in keyof T]: NonNullable<T[P]>;
};
export declare type UserContext = Branded<Record<string, any>, "UserContext">;
export declare type AppInfo = {
    appName: string;
    websiteDomain?: string;
    origin?: string | ((input: { request: BaseRequest | undefined; userContext: UserContext }) => string);
    websiteBasePath?: string;
    apiDomain: string;
    apiBasePath?: string;
    apiGatewayPath?: string;
};
export declare type NormalisedAppinfo = {
    appName: string;
    getOrigin: (input: { request: BaseRequest | undefined; userContext: UserContext }) => NormalisedURLDomain;
    apiDomain: NormalisedURLDomain;
    topLevelAPIDomain: string;
    getTopLevelWebsiteDomain: (input: { request: BaseRequest | undefined; userContext: UserContext }) => string;
    apiBasePath: NormalisedURLPath;
    apiGatewayPath: NormalisedURLPath;
    websiteBasePath: NormalisedURLPath;
};
export declare type SuperTokensInfo = {
    connectionURI: string;
    apiKey?: string;
    networkInterceptor?: NetworkInterceptor;
    disableCoreCallCache?: boolean;
};
export declare type TypeInput = {
    supertokens?: SuperTokensInfo;
    framework?: TypeFramework;
    appInfo: AppInfo;
    recipeList: RecipeListFunction[];
    telemetry?: boolean;
    isInServerlessEnv?: boolean;
    debug?: boolean;
};
export declare type NetworkInterceptor = (request: HttpRequest, userContext: UserContext) => HttpRequest;
export interface HttpRequest {
    url: string;
    method: HTTPMethod;
    headers: {
        [key: string]: string | number | string[];
    };
    params?: Record<string, boolean | number | string | undefined>;
    body?: any;
}
export declare type RecipeListFunction = (appInfo: NormalisedAppinfo, isInServerlessEnv: boolean) => RecipeModule;
export declare type APIHandled = {
    pathWithoutApiBasePath: NormalisedURLPath;
    method: HTTPMethod;
    id: string;
    disabled: boolean;
};
export declare type HTTPMethod = "post" | "get" | "delete" | "put" | "patch" | "options" | "trace";
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
export declare type User = {
    id: string;
    timeJoined: number;
    isPrimaryUser: boolean;
    tenantIds: string[];
    emails: string[];
    phoneNumbers: string[];
    thirdParty: {
        id: string;
        userId: string;
    }[];
    loginMethods: (RecipeLevelUser & {
        verified: boolean;
        hasSameEmailAs: (email: string | undefined) => boolean;
        hasSamePhoneNumberAs: (phoneNumber: string | undefined) => boolean;
        hasSameThirdPartyInfoAs: (thirdParty?: { id: string; userId: string }) => boolean;
        toJson: () => any;
    })[];
    toJson: () => any;
};
export {};
