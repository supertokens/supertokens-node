// @ts-nocheck
import { BaseRequest, BaseResponse } from "../../framework";
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
        functions?: (originalImplementation: RecipeInterface) => RecipeInterface;
        apis?: (originalImplementation: APIInterface) => APIInterface;
    };
};
export declare type TypeNormalisedInput = {
    jwtValiditySeconds: number;
    override: {
        functions: (originalImplementation: RecipeInterface) => RecipeInterface;
        apis: (originalImplementation: APIInterface) => APIInterface;
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
export interface RecipeInterface {
    createJWT(input: {
        payload?: any;
        validitySeconds?: number;
    }): Promise<
        | {
              status: "OK";
              jwt: string;
          }
        | {
              status: "UNSUPPORTED_ALGORITHM_ERROR";
          }
    >;
    getJWKS(): Promise<{
        status: "OK";
        keys: JsonWebKey[];
    }>;
}
export interface APIInterface {
    getJWKSGET:
        | undefined
        | ((input: {
              options: APIOptions;
          }) => Promise<{
              status: "OK";
              keys: JsonWebKey[];
          }>);
}
