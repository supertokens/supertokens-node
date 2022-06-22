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
    static thirdPartySignInUp(
        thirdPartyId: string,
        thirdPartyUserId: string,
        email: {
            id: string;
            isVerified: boolean;
        },
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
    ): Promise<
        | ({
              email?: string | undefined;
              phoneNumber?: string | undefined;
          } & {
              id: string;
              timeJoined: number;
          })
        | ({
              email: string;
              thirdParty: {
                  id: string;
                  userId: string;
              };
          } & {
              id: string;
              timeJoined: number;
          })
        | undefined
    >;
    static getUserById(
        userId: string,
        userContext?: any
    ): Promise<
        | ({
              email?: string | undefined;
              phoneNumber?: string | undefined;
          } & {
              id: string;
              timeJoined: number;
          })
        | ({
              email: string;
              thirdParty: {
                  id: string;
                  userId: string;
              };
          } & {
              id: string;
              timeJoined: number;
          })
        | undefined
    >;
    static getUsersByEmail(email: string, userContext?: any): Promise<User[]>;
    static createEmailVerificationToken(
        userId: string,
        userContext?: any
    ): Promise<
        | {
              status: "OK";
              token: string;
          }
        | {
              status: "EMAIL_ALREADY_VERIFIED_ERROR";
          }
    >;
    static verifyEmailUsingToken(
        token: string,
        userContext?: any
    ): Promise<
        | {
              status: "EMAIL_VERIFICATION_INVALID_TOKEN_ERROR";
          }
        | ({
              email?: string | undefined;
              phoneNumber?: string | undefined;
          } & {
              id: string;
              timeJoined: number;
          })
        | ({
              email: string;
              thirdParty: {
                  id: string;
                  userId: string;
              };
          } & {
              id: string;
              timeJoined: number;
          })
        | undefined
    >;
    static isEmailVerified(userId: string, userContext?: any): Promise<boolean>;
    static revokeEmailVerificationTokens(
        userId: string,
        userContext?: any
    ): Promise<{
        status: "OK";
    }>;
    static unverifyEmail(
        userId: string,
        userContext?: any
    ): Promise<{
        status: "OK";
    }>;
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
                  userContext?: any;
              }
            | {
                  preAuthSessionId: string;
                  linkCode: string;
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
        userContext?: any;
    }): Promise<
        | ({
              email?: string | undefined;
              phoneNumber?: string | undefined;
          } & {
              id: string;
              timeJoined: number;
          })
        | ({
              email: string;
              thirdParty: {
                  id: string;
                  userId: string;
              };
          } & {
              id: string;
              timeJoined: number;
          })
        | undefined
    >;
    static updatePasswordlessUser(input: {
        userId: string;
        email?: string | null;
        phoneNumber?: string | null;
        userContext?: any;
    }): Promise<{
        status: "OK" | "EMAIL_ALREADY_EXISTS_ERROR" | "UNKNOWN_USER_ID_ERROR" | "PHONE_NUMBER_ALREADY_EXISTS_ERROR";
    }>;
    static revokeAllCodes(
        input:
            | {
                  email: string;
                  userContext?: any;
              }
            | {
                  phoneNumber: string;
                  userContext?: any;
              }
    ): Promise<{
        status: "OK";
    }>;
    static revokeCode(input: {
        codeId: string;
        userContext?: any;
    }): Promise<{
        status: "OK";
    }>;
    static listCodesByEmail(input: {
        email: string;
        userContext?: any;
    }): Promise<import("../passwordless/types").DeviceType[]>;
    static listCodesByPhoneNumber(input: {
        phoneNumber: string;
        userContext?: any;
    }): Promise<import("../passwordless/types").DeviceType[]>;
    static listCodesByDeviceId(input: {
        deviceId: string;
        userContext?: any;
    }): Promise<import("../passwordless/types").DeviceType | undefined>;
    static listCodesByPreAuthSessionId(input: {
        preAuthSessionId: string;
        userContext?: any;
    }): Promise<import("../passwordless/types").DeviceType | undefined>;
    static createMagicLink(
        input:
            | {
                  email: string;
                  userContext?: any;
              }
            | {
                  phoneNumber: string;
                  userContext?: any;
              }
    ): Promise<string>;
    static passwordlessSignInUp(
        input:
            | {
                  email: string;
                  userContext?: any;
              }
            | {
                  phoneNumber: string;
                  userContext?: any;
              }
    ): Promise<{
        status: string;
        createdNewUser: boolean;
        user: import("../passwordless/types").User;
    }>;
    static Google: typeof import("../thirdparty/providers/google").default;
    static Github: typeof import("../thirdparty/providers/github").default;
    static Facebook: typeof import("../thirdparty/providers/facebook").default;
    static Apple: typeof import("../thirdparty/providers/apple").default;
    static Discord: typeof import("../thirdparty/providers/discord").default;
    static GoogleWorkspaces: typeof import("../thirdparty/providers/googleWorkspaces").default;
    static sendEmail(
        input: TypeThirdPartyPasswordlessEmailDeliveryInput & {
            userContext: any;
        }
    ): Promise<void>;
    static sendSms(
        input: TypePasswordlessSmsDeliveryInput & {
            userContext: any;
        }
    ): Promise<void>;
}
export declare let init: typeof Recipe.init;
export declare let Error: typeof SuperTokensError;
export declare let thirdPartySignInUp: typeof Wrapper.thirdPartySignInUp;
export declare let passwordlessSignInUp: typeof Wrapper.passwordlessSignInUp;
export declare let getUserById: typeof Wrapper.getUserById;
export declare let getUserByThirdPartyInfo: typeof Wrapper.getUserByThirdPartyInfo;
export declare let getUsersByEmail: typeof Wrapper.getUsersByEmail;
export declare let createEmailVerificationToken: typeof Wrapper.createEmailVerificationToken;
export declare let verifyEmailUsingToken: typeof Wrapper.verifyEmailUsingToken;
export declare let isEmailVerified: typeof Wrapper.isEmailVerified;
export declare let revokeEmailVerificationTokens: typeof Wrapper.revokeEmailVerificationTokens;
export declare let unverifyEmail: typeof Wrapper.unverifyEmail;
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
export declare let Google: typeof import("../thirdparty/providers/google").default;
export declare let Github: typeof import("../thirdparty/providers/github").default;
export declare let Facebook: typeof import("../thirdparty/providers/facebook").default;
export declare let Apple: typeof import("../thirdparty/providers/apple").default;
export declare let Discord: typeof import("../thirdparty/providers/discord").default;
export declare let GoogleWorkspaces: typeof import("../thirdparty/providers/googleWorkspaces").default;
export type { RecipeInterface, TypeProvider, User, APIInterface, PasswordlessAPIOptions, ThirdPartyAPIOptions };
export declare let sendEmail: typeof Wrapper.sendEmail;
export declare let sendSms: typeof Wrapper.sendSms;
