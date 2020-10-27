import RecipeModule from "./recipeModule";
import NormalisedURLDomain from "./normalisedURLDomain";
import NormalisedURLPath from "./normalisedURLPath";
export declare type AppInfo = {
    appName: string;
    websiteDomain: string;
    apiDomain: string;
    apiBasePath?: string;
    websiteBasePath?: string;
};
export declare type NormalisedAppinfo = {
    appName: string;
    websiteDomain: NormalisedURLDomain;
    apiDomain: NormalisedURLDomain;
    apiBasePath: NormalisedURLPath;
    websiteBasePath: NormalisedURLPath;
};
export declare type TypeInput = {
    supertokens: {
        connectionURI: string;
        apiKey?: string;
    };
    appInfo: AppInfo;
    recipeList: RecipeListFunction[];
};
export declare type RecipeListFunction = (appInfo: NormalisedAppinfo) => RecipeModule;
export declare type APIHandled = {
    pathWithoutApiBasePath: NormalisedURLPath;
    method: HTTPMethod;
    id: string;
    disabled: boolean;
};
export declare type HTTPMethod = "post" | "get" | "delete" | "put" | "options" | "trace";
