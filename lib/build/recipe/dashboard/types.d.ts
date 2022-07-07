// @ts-nocheck
import OverrideableBuilder from "supertokens-js-override";
import { BaseRequest, BaseResponse } from "../../framework";
export declare type TypeInput = {
    override?: {
        functions?: (
            originalImplementation: RecipeInterface,
            builder?: OverrideableBuilder<RecipeInterface>
        ) => RecipeInterface;
        apis?: (originalImplementation: APIInterface, builder?: OverrideableBuilder<APIInterface>) => APIInterface;
    };
};
export declare type TypeNormalisedInput = {
    override: {
        functions: (
            originalImplementation: RecipeInterface,
            builder?: OverrideableBuilder<RecipeInterface>
        ) => RecipeInterface;
        apis: (originalImplementation: APIInterface, builder?: OverrideableBuilder<APIInterface>) => APIInterface;
    };
};
export declare type RecipeInterface = {
    getDashboardBundleURL(input: { userContext: any }): Promise<string>;
};
export declare type APIOptions = {
    recipeImplementation: RecipeInterface;
    config: TypeNormalisedInput;
    recipeId: string;
    req: BaseRequest;
    res: BaseResponse;
    isInServerlessEnv: boolean;
};
export declare type APIInterface = {
    dashboardGET: undefined | ((input: { options: APIOptions; userContext: any }) => Promise<string>);
};
