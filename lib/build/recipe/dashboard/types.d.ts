// @ts-nocheck
import OverrideableBuilder from "supertokens-js-override";
import { BaseRequest, BaseResponse } from "../../framework";
import { NormalisedAppinfo } from "../../types";
export declare type TypeInput = {
    apiKey: string;
    override?: {
        functions?: (
            originalImplementation: RecipeInterface,
            builder?: OverrideableBuilder<RecipeInterface>
        ) => RecipeInterface;
        apis?: (originalImplementation: APIInterface, builder?: OverrideableBuilder<APIInterface>) => APIInterface;
    };
};
export declare type TypeNormalisedInput = {
    apiKey: string;
    override: {
        functions: (
            originalImplementation: RecipeInterface,
            builder?: OverrideableBuilder<RecipeInterface>
        ) => RecipeInterface;
        apis: (originalImplementation: APIInterface, builder?: OverrideableBuilder<APIInterface>) => APIInterface;
    };
};
export declare type RecipeInterface = {
    getDashboardBundleLocation(input: { userContext: any }): Promise<string>;
    shouldAllowAccess(input: { req: BaseRequest; config: TypeNormalisedInput; userContext: any }): Promise<boolean>;
};
export declare type APIOptions = {
    recipeImplementation: RecipeInterface;
    config: TypeNormalisedInput;
    recipeId: string;
    req: BaseRequest;
    res: BaseResponse;
    isInServerlessEnv: boolean;
    appInfo: NormalisedAppinfo;
};
export declare type APIInterface = {
    dashboardGET: undefined | ((input: { options: APIOptions; userContext: any }) => Promise<string>);
};
export declare type APIFunction = (apiImplementation: APIInterface, options: APIOptions) => Promise<any>;
export declare type RecipeIdForUser = "emailpassword" | "thirdparty" | "passwordless";
declare type CommonUserInformation = {
    id: string;
    timeJoined: number;
    firstName: string;
    lastName: string;
};
export declare type EmailPasswordUser = CommonUserInformation & {
    email: string;
};
export declare type ThirdPartyUser = CommonUserInformation & {
    email: string;
    thirdParty: {
        id: string;
        userId: string;
    };
};
export declare type PasswordlessUser = CommonUserInformation & {
    email?: string;
    phone?: string;
};
export {};
