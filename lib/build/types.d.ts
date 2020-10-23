import RecipeModule from "./recipeModule";
export declare type AppInfo = {
    appName: string;
    websiteDomain: string;
    apiDomain: string;
    apiBasePath?: string;
    websiteBasePath?: string;
};
export declare type NormalisedAppinfo = {
    appName: string;
    websiteDomain: string;
    apiDomain: string;
    apiBasePath: string;
    websiteBasePath: string;
};
export declare type TypeInput = {
    supertokens: {
        connectionURI: string;
        apiKey: string;
    };
    appInfo: AppInfo;
    recipeList: RecipeListFunction[];
};
export declare type RecipeListFunction = (appInfo: NormalisedAppinfo) => RecipeModule;
export declare type APIHandled = {
    pathWithoutApiBasePath: string;
    method: HTTPMethod;
    id: string;
    disabled: boolean;
};
export declare type HTTPMethod = "post" | "get" | "delete" | "put" | "options" | "trace";
