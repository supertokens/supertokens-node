// @ts-nocheck
import OverrideableBuilder from "supertokens-js-override";
import type { BaseRequest, BaseResponse } from "../../framework";
import { NormalisedAppinfo, User, UserContext } from "../../types";
export declare type TypeInput = {
    apiKey?: string;
    admins?: string[];
    override?: {
        functions?: (
            originalImplementation: RecipeInterface,
            builder?: OverrideableBuilder<RecipeInterface>
        ) => RecipeInterface;
        apis?: (originalImplementation: APIInterface, builder?: OverrideableBuilder<APIInterface>) => APIInterface;
    };
};
export declare type TypeNormalisedInput = {
    apiKey?: string;
    admins?: string[];
    authMode: AuthMode;
    override: {
        functions: (
            originalImplementation: RecipeInterface,
            builder?: OverrideableBuilder<RecipeInterface>
        ) => RecipeInterface;
        apis: (originalImplementation: APIInterface, builder?: OverrideableBuilder<APIInterface>) => APIInterface;
    };
};
export declare type RecipeInterface = {
    getDashboardBundleLocation(input: { userContext: UserContext }): Promise<string>;
    shouldAllowAccess(input: {
        req: BaseRequest;
        config: TypeNormalisedInput;
        userContext: UserContext;
    }): Promise<boolean>;
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
    dashboardGET: undefined | ((input: { options: APIOptions; userContext: UserContext }) => Promise<string>);
};
export declare type APIFunction = (
    apiImplementation: APIInterface,
    tenantId: string,
    options: APIOptions,
    userContext: UserContext
) => Promise<any>;
export declare type RecipeIdForUser = "emailpassword" | "thirdparty" | "passwordless" | "webauthn";
export declare type AuthMode = "api-key" | "email-password";
export declare type UserWithFirstAndLastName = User & {
    firstName?: string;
    lastName?: string;
};
export declare type CoreConfigFieldInfo = {
    key: string;
    valueType: "string" | "boolean" | "number";
    value: string | number | boolean | null;
    description: string;
    isDifferentAcrossTenants: boolean;
    possibleValues?: string[];
    isNullable: boolean;
    defaultValue: string | number | boolean | null;
    isPluginProperty: boolean;
    isPluginPropertyEditable: boolean;
};
