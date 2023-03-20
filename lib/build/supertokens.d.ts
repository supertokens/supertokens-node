// @ts-nocheck
import { TypeInput, NormalisedAppinfo, HTTPMethod, SuperTokensInfo } from "./types";
import RecipeModule from "./recipeModule";
import NormalisedURLPath from "./normalisedURLPath";
import { BaseRequest, BaseResponse } from "./framework";
import { TypeFramework } from "./framework/types";
export default class SuperTokens {
    private static instance;
    framework: TypeFramework;
    appInfo: NormalisedAppinfo;
    isInServerlessEnv: boolean;
    recipeModules: RecipeModule[];
    supertokens: undefined | SuperTokensInfo;
    telemetryEnabled: boolean;
    constructor(config: TypeInput);
    sendTelemetry: () => Promise<void>;
    static init(config: TypeInput): void;
    static reset(): void;
    static getInstanceOrThrowError(): SuperTokens;
    handleAPI: (
        matchedRecipe: RecipeModule,
        id: string,
        request: BaseRequest,
        response: BaseResponse,
        path: NormalisedURLPath,
        method: HTTPMethod
    ) => Promise<boolean>;
    getAllCORSHeaders: () => string[];
    getUserCount: (includeRecipeIds?: string[] | undefined) => Promise<number>;
    getUsers: (input: {
        timeJoinedOrder: "ASC" | "DESC";
        limit?: number;
        paginationToken?: string;
        includeRecipeIds?: string[];
    }) => Promise<{
        users: {
            recipeId: string;
            user: any;
        }[];
        nextPaginationToken?: string;
    }>;
    deleteUser: (input: {
        userId: string;
    }) => Promise<{
        status: "OK";
    }>;
    createUserIdMapping: (input: {
        superTokensUserId: string;
        externalUserId: string;
        externalUserIdInfo?: string;
        force?: boolean;
    }) => Promise<
        | {
              status: "OK" | "UNKNOWN_SUPERTOKENS_USER_ID_ERROR";
          }
        | {
              status: "USER_ID_MAPPING_ALREADY_EXISTS_ERROR";
              doesSuperTokensUserIdExist: boolean;
              doesExternalUserIdExist: boolean;
          }
    >;
    getUserIdMapping: (input: {
        userId: string;
        userIdType?: "SUPERTOKENS" | "EXTERNAL" | "ANY";
    }) => Promise<
        | {
              status: "OK";
              superTokensUserId: string;
              externalUserId: string;
              externalUserIdInfo: string | undefined;
          }
        | {
              status: "UNKNOWN_MAPPING_ERROR";
          }
    >;
    deleteUserIdMapping: (input: {
        userId: string;
        userIdType?: "SUPERTOKENS" | "EXTERNAL" | "ANY";
        force?: boolean;
    }) => Promise<{
        status: "OK";
        didMappingExist: boolean;
    }>;
    updateOrDeleteUserIdMappingInfo: (input: {
        userId: string;
        userIdType?: "SUPERTOKENS" | "EXTERNAL" | "ANY";
        externalUserIdInfo?: string;
    }) => Promise<{
        status: "OK" | "UNKNOWN_MAPPING_ERROR";
    }>;
    middleware: (request: BaseRequest, response: BaseResponse) => Promise<boolean>;
    errorHandler: (err: any, request: BaseRequest, response: BaseResponse) => Promise<void>;
}
