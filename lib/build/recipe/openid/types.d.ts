// @ts-nocheck
import OverrideableBuilder from "supertokens-js-override";
import { BaseRequest, BaseResponse } from "../../framework";
import NormalisedURLDomain from "../../normalisedURLDomain";
import NormalisedURLPath from "../../normalisedURLPath";
import { RecipeInterface as JWTRecipeInterface, APIInterface as JWTAPIInterface, JsonWebKey } from "../jwt/types";
import { GeneralErrorResponse } from "../../types";
export declare type TypeInput = {
    issuer?: string;
    jwtValiditySeconds?: number;
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
    issuerDomain: NormalisedURLDomain;
    issuerPath: NormalisedURLPath;
    jwtValiditySeconds?: number;
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
        | ((input: {
              options: APIOptions;
              userContext: any;
          }) => Promise<
              | {
                    status: "OK";
                    issuer: string;
                    jwks_uri: string;
                }
              | GeneralErrorResponse
          >);
};
export declare type RecipeInterface = {
    getOpenIdDiscoveryConfiguration(input: {
        userContext: any;
    }): Promise<{
        status: "OK";
        issuer: string;
        jwks_uri: string;
    }>;
    createJWT(input: {
        payload?: any;
        validitySeconds?: number;
        userContext: any;
    }): Promise<
        | {
              status: "OK";
              jwt: string;
          }
        | {
              status: "UNSUPPORTED_ALGORITHM_ERROR";
          }
    >;
    getJWKS(input: {
        userContext: any;
    }): Promise<{
        status: "OK";
        keys: JsonWebKey[];
    }>;
};
