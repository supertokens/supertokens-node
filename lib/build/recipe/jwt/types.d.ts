// @ts-nocheck
import type { BaseRequest, BaseResponse } from "../../framework";
import OverrideableBuilder from "supertokens-js-override";
import { GeneralErrorResponse, UserContext } from "../../types";
export declare type JsonWebKey = {
    kty: string;
    kid: string;
    n: string;
    e: string;
    alg: string;
    use: string;
};
export declare type TypeInput = {
    jwtValiditySeconds?: number;
    override?: {
        functions?: (
            originalImplementation: RecipeInterface,
            builder?: OverrideableBuilder<RecipeInterface>
        ) => RecipeInterface;
        apis?: (originalImplementation: APIInterface, builder?: OverrideableBuilder<APIInterface>) => APIInterface;
    };
};
export declare type TypeNormalisedInput = {
    jwtValiditySeconds: number;
    override: {
        functions: (
            originalImplementation: RecipeInterface,
            builder?: OverrideableBuilder<RecipeInterface>
        ) => RecipeInterface;
        apis: (originalImplementation: APIInterface, builder?: OverrideableBuilder<APIInterface>) => APIInterface;
    };
};
export declare type APIOptions = {
    recipeImplementation: RecipeInterface;
    config: TypeNormalisedInput;
    recipeId: string;
    isInServerlessEnv: boolean;
    req: BaseRequest;
    res: BaseResponse;
};
export declare type RecipeInterface = {
    createJWT(input: {
        payload?: any;
        validitySeconds?: number;
        useStaticSigningKey?: boolean;
        userContext: UserContext;
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
        userContext: UserContext;
    }): Promise<{
        keys: JsonWebKey[];
        validityInSeconds?: number;
    }>;
};
export declare type APIInterface = {
    getJWKSGET:
        | undefined
        | ((input: {
              options: APIOptions;
              userContext: UserContext;
          }) => Promise<
              | {
                    keys: JsonWebKey[];
                }
              | GeneralErrorResponse
          >);
};
