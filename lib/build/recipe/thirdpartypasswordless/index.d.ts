// @ts-nocheck
import Recipe from "./recipe";
import SuperTokensError from "./error";
import {
    RecipeInterface,
    User,
    APIInterface,
    PasswordlessAPIOptions,
    ThirdPartyAPIOptions,
    TypeThirdPartyPasswordlessEmailDeliveryInput,
} from "./types";
import { TypeProvider } from "../thirdparty/types";
import { TypePasswordlessSmsDeliveryInput } from "../passwordless/types";
export default class Wrapper {
    static init: typeof Recipe.init;
    static Error: typeof SuperTokensError;
    static thirdPartyGetProvider(
        thirdPartyId: string,
        tenantId: string | undefined,
        clientType: string | undefined,
        userContext?: any
    ): Promise<{
        status: "OK";
        provider: TypeProvider;
        thirdPartyEnabled: boolean;
    }>;
    static thirdPartyManuallyCreateOrUpdateUser(
        thirdPartyId: string,
        thirdPartyUserId: string,
        email: string,
        userContext?: any
    ): Promise<{
        status: "OK";
        createdNewUser: boolean;
        user: User;
    }>;
    static getUserByThirdPartyInfo(
        thirdPartyId: string,
        thirdPartyUserId: string,
        userContext?: any
    ): Promise<User | undefined>;
    static getUserById(userId: string, userContext?: any): Promise<User | undefined>;
    static getUsersByEmail(email: string, userContext?: any): Promise<User[]>;
    static createCode(
        input: (
            | {
                  email: string;
              }
            | {
                  phoneNumber: string;
              }
        ) & {
            userInputCode?: string;
            tenantId?: string;
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
        tenantId?: string;
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
                  tenantId?: string;
                  userContext?: any;
              }
            | {
                  preAuthSessionId: string;
                  linkCode: string;
                  tenantId?: string;
                  userContext?: any;
              }
    ): Promise<
        | {
              status: "OK";
              createdNewUser: boolean;
              user: User;
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
    static getUserByPhoneNumber(input: {
        phoneNumber: string;
        tenantId?: string;
        userContext?: any;
    }): Promise<User | undefined>;
    static updatePasswordlessUser(input: {
        userId: string;
        email?: string | null;
        phoneNumber?: string | null;
        userContext?: any;
    }): Promise<{
        status: "OK" | "UNKNOWN_USER_ID_ERROR" | "EMAIL_ALREADY_EXISTS_ERROR" | "PHONE_NUMBER_ALREADY_EXISTS_ERROR";
    }>;
    static revokeAllCodes(
        input:
            | {
                  email: string;
                  tenantId?: string;
                  userContext?: any;
              }
            | {
                  phoneNumber: string;
                  tenantId?: string;
                  userContext?: any;
              }
    ): Promise<{
        status: "OK";
    }>;
    static revokeCode(input: {
        codeId: string;
        tenantId?: string;
        userContext?: any;
    }): Promise<{
        status: "OK";
    }>;
    static listCodesByEmail(input: {
        email: string;
        tenantId?: string;
        userContext?: any;
    }): Promise<import("../passwordless/types").DeviceType[]>;
    static listCodesByPhoneNumber(input: {
        phoneNumber: string;
        tenantId?: string;
        userContext?: any;
    }): Promise<import("../passwordless/types").DeviceType[]>;
    static listCodesByDeviceId(input: {
        deviceId: string;
        tenantId?: string;
        userContext?: any;
    }): Promise<import("../passwordless/types").DeviceType | undefined>;
    static listCodesByPreAuthSessionId(input: {
        preAuthSessionId: string;
        tenantId?: string;
        userContext?: any;
    }): Promise<import("../passwordless/types").DeviceType | undefined>;
    static createMagicLink(
        input:
            | {
                  email: string;
                  tenantId?: string;
                  userContext?: any;
              }
            | {
                  phoneNumber: string;
                  tenantId?: string;
                  userContext?: any;
              }
    ): Promise<string>;
    static passwordlessSignInUp(
        input:
            | {
                  email: string;
                  tenantId?: string;
                  userContext?: any;
              }
            | {
                  phoneNumber: string;
                  tenantId?: string;
                  userContext?: any;
              }
    ): Promise<{
        status: string;
        createdNewUser: boolean;
        user: import("../passwordless/types").User;
    }>;
    static sendEmail(
        input: TypeThirdPartyPasswordlessEmailDeliveryInput & {
            tenantId?: string;
            userContext?: any;
        }
    ): Promise<void>;
    static sendSms(
        input: TypePasswordlessSmsDeliveryInput & {
            tenantId?: string;
            userContext?: any;
        }
    ): Promise<void>;
}
export declare let init: typeof Recipe.init;
export declare let Error: typeof SuperTokensError;
export declare let thirdPartyGetProvider: typeof Wrapper.thirdPartyGetProvider;
export declare let thirdPartyManuallyCreateOrUpdateUser: typeof Wrapper.thirdPartyManuallyCreateOrUpdateUser;
export declare let passwordlessSignInUp: typeof Wrapper.passwordlessSignInUp;
export declare let getUserById: typeof Wrapper.getUserById;
export declare let getUserByThirdPartyInfo: typeof Wrapper.getUserByThirdPartyInfo;
export declare let getUsersByEmail: typeof Wrapper.getUsersByEmail;
export declare let createCode: typeof Wrapper.createCode;
export declare let consumeCode: typeof Wrapper.consumeCode;
export declare let getUserByPhoneNumber: typeof Wrapper.getUserByPhoneNumber;
export declare let listCodesByDeviceId: typeof Wrapper.listCodesByDeviceId;
export declare let listCodesByEmail: typeof Wrapper.listCodesByEmail;
export declare let listCodesByPhoneNumber: typeof Wrapper.listCodesByPhoneNumber;
export declare let listCodesByPreAuthSessionId: typeof Wrapper.listCodesByPreAuthSessionId;
export declare let createNewCodeForDevice: typeof Wrapper.createNewCodeForDevice;
export declare let updatePasswordlessUser: typeof Wrapper.updatePasswordlessUser;
export declare let revokeAllCodes: typeof Wrapper.revokeAllCodes;
export declare let revokeCode: typeof Wrapper.revokeCode;
export declare let createMagicLink: typeof Wrapper.createMagicLink;
export type { RecipeInterface, TypeProvider, User, APIInterface, PasswordlessAPIOptions, ThirdPartyAPIOptions };
export declare let sendEmail: typeof Wrapper.sendEmail;
export declare let sendSms: typeof Wrapper.sendSms;
