// @ts-nocheck
import OverrideableBuilder from "supertokens-js-override";
export declare type TypeInput = {
    override?: {
        functions?: (
            originalImplementation: RecipeInterface,
            builder?: OverrideableBuilder<RecipeInterface>
        ) => RecipeInterface;
        apis?: (originalImplementation: APIInterface, builder?: OverrideableBuilder<APIInterface>) => APIInterface;
    };
};
export declare type TypeNormalisedInput = {
    override: {
        functions: (
            originalImplementation: RecipeInterface,
            builder?: OverrideableBuilder<RecipeInterface>
        ) => RecipeInterface;
        apis: (originalImplementation: APIInterface, builder?: OverrideableBuilder<APIInterface>) => APIInterface;
    };
};
export declare type APIInterface = {};
export declare type RecipeInterface = {
    createUserIdMapping: (input: {
        superTokensUserId: string;
        externalUserId: string;
        externalUserIdInfo?: string;
        userContext: any;
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
        userContext: any;
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
        userContext: any;
    }) => Promise<{
        status: "OK";
        didMappingExist: boolean;
    }>;
    updateOrDeleteUserIdMappingInfo: (input: {
        userId: string;
        userIdType?: "SUPERTOKENS" | "EXTERNAL" | "ANY";
        externalUserIdInfo: string | null;
        userContext: any;
    }) => Promise<
        | {
              status: "OK";
          }
        | {
              status: "UNKNOWN_MAPPING_ERROR";
          }
    >;
};
