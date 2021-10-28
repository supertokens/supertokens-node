// @ts-nocheck
import { BaseRequest, BaseResponse } from "../../framework";
export declare type TypeInput = {
    connectionURL: string | undefined;
    apiKey?: string;
};
export interface RecipeInterface {
    checkConnectionToCore: (
        apiKey: string | undefined,
        connectionURI: string | undefined
    ) => Promise<{
        status: "OK" | "NOT_OK";
        message?: string;
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
export declare type HealthCheckResponse = {
    status: string;
    message?: string;
};
export interface APIInterface {
    healthCheckGET:
        | undefined
        | ((input: {
              options: APIOptions;
              apiImplementation: APIInterface;
          }) => Promise<
              | {
                    status: "OK";
                    message?: string;
                }
              | {
                    status: "NOT_OK";
                    message?: string;
                }
          >);
}
