// @ts-nocheck
import OverrideableBuilder from "supertokens-js-override";
import { BaseRequest, BaseResponse } from "../../framework";
import { RecipeInterface as JWTRecipeInterface, APIInterface as JWTAPIInterface } from "../jwt/types";
export declare type TypeInput = {
    issuer: string;
    override?: {
        functions?: (
            originalImplementation: RecipeInterface,
            builder?: OverrideableBuilder<RecipeInterface>
        ) => RecipeInterface;
        apis?: (originalImplementation: APIInterface, builder?: OverrideableBuilder<APIInterface>) => APIInterface;
        jwtFeature?: {
            functions?: (
                originalImplementation: JWTRecipeInterface,
                builder?: OverrideableBuilder<JWTRecipeInterface>
            ) => JWTRecipeInterface;
            apis?: (
                originalImplementation: JWTAPIInterface,
                builder?: OverrideableBuilder<JWTAPIInterface>
            ) => JWTAPIInterface;
        };
    };
};
export declare type TypeNormalisedInput = {
    issuer: string;
    override: {
        functions: (
            originalImplementation: RecipeInterface,
            builder?: OverrideableBuilder<RecipeInterface>
        ) => RecipeInterface;
        apis: (originalImplementation: APIInterface, builder?: OverrideableBuilder<APIInterface>) => APIInterface;
        jwtFeature?: {
            functions?: (
                originalImplementation: JWTRecipeInterface,
                builder?: OverrideableBuilder<JWTRecipeInterface>
            ) => JWTRecipeInterface;
            apis?: (
                originalImplementation: JWTAPIInterface,
                builder?: OverrideableBuilder<JWTAPIInterface>
            ) => JWTAPIInterface;
        };
    };
};
export declare type APIOptions = {
    recipeImplementation: RecipeInterface;
    config: TypeNormalisedInput;
    recipeId: string;
    req: BaseRequest;
    res: BaseResponse;
};
export declare type APIInterface = {
    getOpenIdDiscoveryConfigurationGET:
        | undefined
        | ((input: { options: APIOptions }) => Promise<DiscoveryConfiguration>);
};
export declare type DiscoveryConfiguration = {
    status: "OK";
    issuer: string;
    jwks_uri: string;
};
export declare type RecipeInterface = {
    getDiscoveryConfiguration(): Promise<DiscoveryConfiguration>;
};
