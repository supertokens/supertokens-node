// @ts-nocheck
import {
    TypeInput,
    NormalisedAppinfo,
    HTTPMethod,
    SuperTokensInfo,
    UserContext,
    PluginRouteHandler,
    SuperTokensPlugin,
} from "./types";
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
    pluginRouteHandlers: PluginRouteHandler[];
    pluginOverrideMaps: NonNullable<SuperTokensPlugin["overrideMap"]>[];
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
        userContext: UserContext
    ) => Promise<boolean>;
    getAllCORSHeaders: () => string[];
    getUserCount: (
        includeRecipeIds: string[] | undefined,
        tenantId: string | undefined,
        userContext: UserContext
    ) => Promise<number>;
    createUserIdMapping: (input: {
        superTokensUserId: string;
        externalUserId: string;
        externalUserIdInfo?: string;
        force?: boolean;
        userContext: UserContext;
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
        userContext: UserContext;
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
        userContext: UserContext;
    }) => Promise<{
        status: "OK";
        didMappingExist: boolean;
    }>;
    updateOrDeleteUserIdMappingInfo: (input: {
        userId: string;
        userIdType?: "SUPERTOKENS" | "EXTERNAL" | "ANY";
        externalUserIdInfo?: string;
        userContext: UserContext;
    }) => Promise<{
        status: "OK" | "UNKNOWN_MAPPING_ERROR";
    }>;
    middleware: (request: BaseRequest, response: BaseResponse, userContext: UserContext) => Promise<boolean>;
    errorHandler: (err: any, request: BaseRequest, response: BaseResponse, userContext: UserContext) => Promise<void>;
    getRequestFromUserContext: (userContext: UserContext | undefined) => BaseRequest | undefined;
}
