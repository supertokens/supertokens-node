// @ts-nocheck
import OverrideableBuilder from "supertokens-js-override";
import type { BaseRequest, BaseResponse } from "../../framework";
import { NormalisedAppinfo, User, UserContext } from "../../types";
export type TypeInput = {
    apiKey?: string;
    admins?: string[];
    override?: {
        functions?: (
            originalImplementation: RecipeInterface,
            builder: OverrideableBuilder<RecipeInterface>
        ) => RecipeInterface;
        apis?: (originalImplementation: APIInterface, builder: OverrideableBuilder<APIInterface>) => APIInterface;
    };
};
export type TypeNormalisedInput = {
    apiKey?: string;
    admins?: string[];
    authMode: AuthMode;
    override: {
        functions: (
            originalImplementation: RecipeInterface,
            builder: OverrideableBuilder<RecipeInterface>
        ) => RecipeInterface;
        apis: (originalImplementation: APIInterface, builder: OverrideableBuilder<APIInterface>) => APIInterface;
    };
};
export type RecipeInterface = {
    getDashboardBundleLocation(input: { userContext: UserContext }): Promise<string>;
    shouldAllowAccess(input: {
        req: BaseRequest;
        config: TypeNormalisedInput;
        userContext: UserContext;
    }): Promise<boolean>;
};
export type APIOptions = {
    recipeImplementation: RecipeInterface;
    config: TypeNormalisedInput;
    recipeId: string;
    req: BaseRequest;
    res: BaseResponse;
    isInServerlessEnv: boolean;
    appInfo: NormalisedAppinfo;
};
export type APIInterface = {
    dashboardGET: undefined | ((input: { options: APIOptions; userContext: UserContext }) => Promise<string>);
};
export type APIFunction = (
    apiImplementation: APIInterface,
    tenantId: string,
    options: APIOptions,
    userContext: UserContext
) => Promise<any>;
export type RecipeIdForUser = "emailpassword" | "thirdparty" | "passwordless" | "webauthn";
export type AuthMode = "api-key" | "email-password";
export type UserWithFirstAndLastName = User & {
    firstName?: string;
    lastName?: string;
};
export type CoreConfigFieldInfo = {
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
