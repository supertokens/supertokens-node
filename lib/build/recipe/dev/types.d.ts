// @ts-nocheck
import { BaseRequest, BaseResponse } from "../../framework";
export declare type UserInfo = {
    id: string;
    email?: {
        id: string;
        isVerified: boolean;
    };
};
export declare type TypeInput = {
    hosts: string | undefined;
    apiKey?: string;
};
export declare const InputSchema: {
    type: string;
    properties: {};
    additionalProperties: boolean;
};
export declare type TypeNormalisedInput = {
    hosts?: string | undefined;
    apiKey?: string;
};
export interface RecipeInterface {}
export declare type APIOptions = {
    recipeImplementation: RecipeInterface;
    config: TypeNormalisedInput;
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
    healthCheckGET: (input: TypeNormalisedInput) => Promise<HealthCheckResponse>;
}
