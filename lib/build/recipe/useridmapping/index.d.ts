// @ts-nocheck
import Recipe from "./recipe";
import { RecipeInterface } from "./types";
export default class Wrapper {
    static init: typeof Recipe.init;
    static createUserIdMapping(
        superTokensUserId: string,
        externalUserId: string,
        externalUserIdInfo?: string,
        userContext?: any
    ): Promise<
        | {
              status: "OK" | "UNKNOWN_SUPERTOKENS_USER_ID_ERROR";
          }
        | {
              status: "USER_ID_MAPPING_ALREADY_EXISTS_ERROR";
              doesSuperTokensUserIdExist: boolean;
              doesExternalUserIdExist: boolean;
          }
    >;
    static getUserIdMapping(
        userId: string,
        userIdType: "SUPERTOKENS" | "EXTERNAL" | "ANY",
        userContext?: any
    ): Promise<
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
    static deleteUserIdMapping(
        userId: string,
        userIdType: "SUPERTOKENS" | "EXTERNAL" | "ANY",
        userContext?: any
    ): Promise<{
        status: "OK";
        didMappingExist: boolean;
    }>;
    static updateOrDeleteUserIdMappingInfo(
        userId: string,
        userIdType: "SUPERTOKENS" | "EXTERNAL" | "ANY",
        externalUserIdInfo: string | null,
        userContext?: any
    ): Promise<{
        status: "OK" | "UNKNOWN_MAPPING_ERROR";
    }>;
}
export declare const init: typeof Recipe.init;
export declare const createUserIdMapping: typeof Wrapper.createUserIdMapping;
export declare const getUserIdMapping: typeof Wrapper.getUserIdMapping;
export declare const deleteUserIdMapping: typeof Wrapper.deleteUserIdMapping;
export declare const updateOrDeleteUserIdMappingInfo: typeof Wrapper.updateOrDeleteUserIdMappingInfo;
export type { RecipeInterface };
