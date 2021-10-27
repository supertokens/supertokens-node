// @ts-nocheck
import { BaseRequest, BaseResponse } from "../../framework";
import RecipeModule from "../../recipeModule";
export declare type UserInfo = {
    id: string;
    email?: {
        id: string;
        isVerified: boolean;
    };
};
export interface ThirdPartyRecipeModule extends RecipeModule {
    getClientIds?: () => Promise<string[]>;
}
export declare type TypeInput = {
    hosts: string | undefined;
    apiKey?: string;
    recipeModules: ThirdPartyRecipeModule[];
};
export declare const InputSchema: {
    type: string;
    properties: {};
    additionalProperties: boolean;
};
export interface RecipeInterface {}
export declare type APIOptions = {
    recipeImplementation: RecipeInterface;
    config: TypeInput;
    recipeId: string;
    isInServerlessEnv: boolean;
    req: BaseRequest;
    res: BaseResponse;
};
export declare type HealthCheckResponse = {
    status: string;
    message?: string;
};
export interface APIInterface {
    healthCheckGET: (input: TypeInput) => Promise<HealthCheckResponse>;
}
