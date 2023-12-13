// @ts-nocheck
import { TypeInput, NormalisedAppinfo, HTTPMethod, SuperTokensInfo } from "./types";
import RecipeModule from "./recipeModule";
import NormalisedURLPath from "./normalisedURLPath";
import type { BaseRequest, BaseResponse } from "./framework";
import type { TypeFramework } from "./framework/types";
export default class SuperTokens {
    private static instance;
    framework: TypeFramework;
    appInfo: NormalisedAppinfo;
    isInServerlessEnv: boolean;
    recipeModules: RecipeModule[];
    supertokens: undefined | SuperTokensInfo;
    telemetryEnabled: boolean;
    constructor(config: TypeInput);
    static init(config: TypeInput): void;
    static reset(): void;
    static getInstanceOrThrowError(): SuperTokens;
    handleAPI: (
        matchedRecipe: RecipeModule,
        id: string,
        tenantId: string,
        request: BaseRequest,
        response: BaseResponse,
        path: NormalisedURLPath,
        method: HTTPMethod,
        userContext: any
    ) => Promise<boolean>;
    getAllCORSHeaders: () => string[];
    getUserCount: (
        includeRecipeIds?: string[] | undefined,
        tenantId?: string | undefined,
        userContext?: any
    ) => Promise<number>;
    createUserIdMapping: (input: {
        superTokensUserId: string;
        externalUserId: string;
        externalUserIdInfo?: string;
        force?: boolean;
        userContext?: any;
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
        userContext?: any;
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
        userContext?: any;
    }) => Promise<{
        status: "OK";
        didMappingExist: boolean;
    }>;
    updateOrDeleteUserIdMappingInfo: (input: {
        userId: string;
        userIdType?: "SUPERTOKENS" | "EXTERNAL" | "ANY";
        externalUserIdInfo?: string;
        userContext?: any;
    }) => Promise<{
        status: "OK" | "UNKNOWN_MAPPING_ERROR";
    }>;
    middleware: (request: BaseRequest, response: BaseResponse, userContext: any) => Promise<boolean>;
    errorHandler: (err: any, request: BaseRequest, response: BaseResponse, userContext: any) => Promise<void>;
    getRequestFromUserContext: (userContext: any | undefined) => BaseRequest | undefined;
}
