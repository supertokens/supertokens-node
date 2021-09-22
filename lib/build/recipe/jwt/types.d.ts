import { BaseRequest, BaseResponse } from "../../framework";
export declare type CreateJWTResponse =
    | {
          status: "OK";
          jwt: string;
      }
    | {
          status: "UNSUPPORTED_ALGORITHM_ERROR";
      };
export declare type JsonWebKey = {
    kty: string;
    kid: string;
    n: string;
    e: string;
    alg: string;
    use: string;
};
export declare type TypeInput = {
    jwtValidity: number;
    override?: {
        functions?: (originalImplementation: RecipeInterface) => RecipeInterface;
        apis?: (originalImplementation: APIInterface) => APIInterface;
    };
};
export declare type TypeNormalisedInput = {
    jwtValidity: number;
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
    createJWT(input: { payload: any; validity?: number }): Promise<CreateJWTResponse>;
    getJWKS(): Promise<{
        keys: JsonWebKey[];
    }>;
}
export interface APIInterface {
    getJWKSGET:
        | undefined
        | ((input: {
              options: APIOptions;
          }) => Promise<{
              keys: JsonWebKey[];
          }>);
}
