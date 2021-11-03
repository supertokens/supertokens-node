// @ts-nocheck
import { BaseRequest, BaseResponse } from "../../framework";
export declare type TypeInput = {
    connectionURI: string | undefined;
    apiKey?: string;
};
export interface RecipeInterface {
    checkConnectionToCoreAndDevOAuthKeys: (
        apiKey: string | undefined,
        connectionURI: string | undefined
    ) => Promise<{
        status: "OK" | "NOT_OK";
        message: string;
    }>;
}
export declare type APIOptions = {
    recipeImplementation: RecipeInterface;
    config: TypeInput;
    recipeId: string;
    isInServerlessEnv: boolean;
    req: BaseRequest;
    res: BaseResponse;
};
export interface APIInterface {
    healthCheckGET:
        | undefined
        | ((input: {
              options: APIOptions;
          }) => Promise<{
              status: "OK" | "NOT_OK";
              message: string;
          }>);
}
