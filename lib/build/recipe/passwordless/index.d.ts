// @ts-nocheck
import Recipe from "./recipe";
import SuperTokensError from "./error";
import {
    RecipeInterface,
    APIOptions,
    APIInterface,
    TypePasswordlessEmailDeliveryInput,
    TypePasswordlessSmsDeliveryInput,
} from "./types";
import RecipeUserId from "../../recipeUserId";
export default class Wrapper {
    static init: typeof Recipe.init;
    static Error: typeof SuperTokensError;
    static createCode(
        input: (
            | {
                  email: string;
              }
            | {
                  phoneNumber: string;
              }
        ) & {
            tenantId: string;
            userInputCode?: string;
            userContext?: any;
        }
    ): Promise<{
        status: "OK";
        preAuthSessionId: string;
        codeId: string;
        deviceId: string;
        userInputCode: string;
        linkCode: string;
        codeLifetime: number;
        timeCreated: number;
    }>;
    static createNewCodeForDevice(input: {
        deviceId: string;
        userInputCode?: string;
        tenantId: string;
        userContext?: any;
    }): Promise<
        | {
              status: "OK";
              preAuthSessionId: string;
              codeId: string;
              deviceId: string;
              userInputCode: string;
              linkCode: string;
              codeLifetime: number;
              timeCreated: number;
          }
        | {
              status: "RESTART_FLOW_ERROR" | "USER_INPUT_CODE_ALREADY_USED_ERROR";
          }
    >;
    static consumeCode(
        input:
            | {
                  preAuthSessionId: string;
                  userInputCode: string;
                  deviceId: string;
                  tenantId: string;
                  userContext?: any;
              }
            | {
                  preAuthSessionId: string;
                  linkCode: string;
                  tenantId: string;
                  userContext?: any;
              }
    ): Promise<
        | {
              status: "OK";
              createdNewRecipeUser: boolean;
              user: import("../../types").User;
              recipeUserId: RecipeUserId;
          }
        | {
              status: "INCORRECT_USER_INPUT_CODE_ERROR" | "EXPIRED_USER_INPUT_CODE_ERROR";
              failedCodeInputAttemptCount: number;
              maximumCodeInputAttempts: number;
          }
        | {
              status: "RESTART_FLOW_ERROR";
          }
    >;
    static updateUser(input: {
        recipeUserId: RecipeUserId;
        email?: string | null;
        phoneNumber?: string | null;
        userContext?: any;
    }): Promise<
        | {
              status:
                  | "OK"
                  | "UNKNOWN_USER_ID_ERROR"
                  | "EMAIL_ALREADY_EXISTS_ERROR"
                  | "PHONE_NUMBER_ALREADY_EXISTS_ERROR";
          }
        | {
              status: "EMAIL_CHANGE_NOT_ALLOWED_ERROR" | "PHONE_NUMBER_CHANGE_NOT_ALLOWED_ERROR";
              reason: string;
          }
    >;
    static revokeAllCodes(
        input:
            | {
                  email: string;
                  tenantId: string;
                  userContext?: any;
              }
            | {
                  phoneNumber: string;
                  tenantId: string;
                  userContext?: any;
              }
    ): Promise<{
        status: "OK";
    }>;
    static revokeCode(input: {
        codeId: string;
        tenantId: string;
        userContext?: any;
    }): Promise<{
        status: "OK";
    }>;
    static listCodesByEmail(input: {
        email: string;
        tenantId: string;
        userContext?: any;
    }): Promise<import("./types").DeviceType[]>;
    static listCodesByPhoneNumber(input: {
        phoneNumber: string;
        tenantId: string;
        userContext?: any;
    }): Promise<import("./types").DeviceType[]>;
    static listCodesByDeviceId(input: {
        deviceId: string;
        tenantId: string;
        userContext?: any;
    }): Promise<import("./types").DeviceType | undefined>;
    static listCodesByPreAuthSessionId(input: {
        preAuthSessionId: string;
        tenantId: string;
        userContext?: any;
    }): Promise<import("./types").DeviceType | undefined>;
    static createMagicLink(
        input:
            | {
                  email: string;
                  tenantId: string;
                  userContext?: any;
              }
            | {
                  phoneNumber: string;
                  tenantId: string;
                  userContext?: any;
              }
    ): Promise<string>;
    static signInUp(
        input:
            | {
                  email: string;
                  tenantId: string;
                  userContext?: any;
              }
            | {
                  phoneNumber: string;
                  tenantId: string;
                  userContext?: any;
              }
    ): Promise<{
        status: string;
        createdNewRecipeUser: boolean;
        recipeUserId: RecipeUserId;
        user: import("../../types").User;
    }>;
    static sendEmail(
        input: TypePasswordlessEmailDeliveryInput & {
            userContext?: any;
        }
    ): Promise<void>;
    static sendSms(
        input: TypePasswordlessSmsDeliveryInput & {
            userContext?: any;
        }
    ): Promise<void>;
}
export declare let init: typeof Recipe.init;
export declare let Error: typeof SuperTokensError;
export declare let createCode: typeof Wrapper.createCode;
export declare let consumeCode: typeof Wrapper.consumeCode;
export declare let listCodesByDeviceId: typeof Wrapper.listCodesByDeviceId;
export declare let listCodesByEmail: typeof Wrapper.listCodesByEmail;
export declare let listCodesByPhoneNumber: typeof Wrapper.listCodesByPhoneNumber;
export declare let listCodesByPreAuthSessionId: typeof Wrapper.listCodesByPreAuthSessionId;
export declare let createNewCodeForDevice: typeof Wrapper.createNewCodeForDevice;
export declare let updateUser: typeof Wrapper.updateUser;
export declare let revokeAllCodes: typeof Wrapper.revokeAllCodes;
export declare let revokeCode: typeof Wrapper.revokeCode;
export declare let createMagicLink: typeof Wrapper.createMagicLink;
export declare let signInUp: typeof Wrapper.signInUp;
export type { RecipeInterface, APIOptions, APIInterface };
export declare let sendEmail: typeof Wrapper.sendEmail;
export declare let sendSms: typeof Wrapper.sendSms;
