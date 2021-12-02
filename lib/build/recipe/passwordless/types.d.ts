// @ts-nocheck
import { BaseRequest, BaseResponse } from "../../framework";
import OverrideableBuilder from "supertokens-js-override";
import { SessionContainerInterface } from "../session/types";
export declare type User = {
    id: string;
    email?: string;
    phoneNumber?: string;
    timeJoined: number;
};
export declare type TypeInput = (
    | {
          contactMethod: "PHONE";
          validatePhoneNumber?: (phoneNumber: string) => Promise<string | undefined> | string | undefined;
          createAndSendCustomTextMessage?: (
              input: {
                  phoneNumber: string;
                  userInputCode?: string;
                  urlWithLinkCode?: string;
                  codeLifetime: number;
                  preAuthSessionId: string;
              },
              userContext: any
          ) => Promise<void>;
      }
    | {
          contactMethod: "EMAIL";
          validateEmailAddress?: (email: string) => Promise<string | undefined> | string | undefined;
          createAndSendCustomEmail?: (
              input: {
                  email: string;
                  userInputCode?: string;
                  urlWithLinkCode?: string;
                  codeLifetime: number;
                  preAuthSessionId: string;
              },
              userContext: any
          ) => Promise<void>;
      }
) & {
    flowType: "USER_INPUT_CODE" | "MAGIC_LINK" | "USER_INPUT_CODE_AND_MAGIC_LINK";
    getLinkDomainAndPath?: (
        contactInfo:
            | {
                  email: string;
              }
            | {
                  phoneNumber: string;
              },
        userContext: any
    ) => Promise<string> | string;
    getCustomUserInputCode?: (userContext: any) => Promise<string> | string;
    override?: {
        functions?: (
            originalImplementation: RecipeInterface,
            builder: OverrideableBuilder<RecipeInterface>
        ) => RecipeInterface;
        apis?: (originalImplementation: APIInterface, builder: OverrideableBuilder<APIInterface>) => APIInterface;
    };
};
export declare type TypeNormalisedInput = (
    | {
          contactMethod: "PHONE";
          validatePhoneNumber: (phoneNumber: string) => Promise<string | undefined> | string | undefined;
          createAndSendCustomTextMessage: (
              input: {
                  phoneNumber: string;
                  userInputCode?: string;
                  urlWithLinkCode?: string;
                  codeLifetime: number;
                  preAuthSessionId: string;
              },
              userContext: any
          ) => Promise<void>;
      }
    | {
          contactMethod: "EMAIL";
          validateEmailAddress: (email: string) => Promise<string | undefined> | string | undefined;
          createAndSendCustomEmail: (
              input: {
                  email: string;
                  userInputCode?: string;
                  urlWithLinkCode?: string;
                  codeLifetime: number;
                  preAuthSessionId: string;
              },
              userContext: any
          ) => Promise<void>;
      }
) & {
    flowType: "USER_INPUT_CODE" | "MAGIC_LINK" | "USER_INPUT_CODE_AND_MAGIC_LINK";
    getLinkDomainAndPath: (
        contactInfo:
            | {
                  email: string;
              }
            | {
                  phoneNumber: string;
              },
        userContext: any
    ) => Promise<string> | string;
    getCustomUserInputCode?: (userContext: any) => Promise<string> | string;
    override: {
        functions: (
            originalImplementation: RecipeInterface,
            builder: OverrideableBuilder<RecipeInterface>
        ) => RecipeInterface;
        apis: (originalImplementation: APIInterface, builder: OverrideableBuilder<APIInterface>) => APIInterface;
    };
};
export declare type RecipeInterface = {
    createCode: (
        input: (
            | {
                  email: string;
              }
            | {
                  phoneNumber: string;
              }
        ) & {
            userInputCode?: string;
        },
        userContext: any
    ) => Promise<{
        status: "OK";
        preAuthSessionId: string;
        codeId: string;
        deviceId: string;
        userInputCode: string;
        linkCode: string;
        codeLifetime: number;
        timeCreated: number;
    }>;
    resendCode: (
        input: {
            deviceId: string;
            userInputCode?: string;
        },
        userContext: any
    ) => Promise<
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
    consumeCode: (
        input:
            | {
                  userInputCode: string;
                  deviceId: string;
              }
            | {
                  linkCode: string;
              },
        userContext: any
    ) => Promise<
        | {
              status: "OK";
              preAuthSessionId: string;
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
    getUserById: (
        input: {
            userId: string;
        },
        userContext: any
    ) => Promise<User | undefined>;
    getUserByEmail: (
        input: {
            email: string;
        },
        userContext: any
    ) => Promise<User | undefined>;
    getUserByPhoneNumber: (
        input: {
            phoneNumber: string;
        },
        userContext: any
    ) => Promise<User | undefined>;
    updateUser: (
        input: {
            userId: string;
            email?: string | null;
            phoneNumber?: string | null;
        },
        userContext: any
    ) => Promise<{
        status: "OK" | "UNKNOWN_USER_ID_ERROR" | "EMAIL_ALREADY_EXISTS_ERROR" | "PHONE_NUMBER_ALREADY_EXISTS_ERROR";
    }>;
    revokeAllCodes: (
        input:
            | {
                  email: string;
              }
            | {
                  phoneNumber: string;
              },
        userContext: any
    ) => Promise<{
        status: "OK";
    }>;
    revokeCode: (
        input: {
            codeId: string;
        },
        userContext: any
    ) => Promise<{
        status: "OK";
    }>;
    listCodesByEmail: (
        input: {
            email: string;
        },
        userContext: any
    ) => Promise<DeviceType[]>;
    listCodesByPhoneNumber: (
        input: {
            phoneNumber: string;
        },
        userContext: any
    ) => Promise<DeviceType[]>;
    listCodesByDeviceId: (
        input: {
            deviceId: string;
        },
        userContext: any
    ) => Promise<DeviceType | undefined>;
    listCodesByPreAuthSessionId: (
        input: {
            preAuthSessionId: string;
        },
        userContext: any
    ) => Promise<DeviceType | undefined>;
};
declare type DeviceType = {
    preAuthSessionId: string;
    failedCodeInputAttemptCount: number;
    email?: string;
    phoneNumber?: string;
    codes: {
        codeId: string;
        timeCreated: string;
        codeLifetime: number;
    }[];
};
export declare type APIOptions = {
    recipeImplementation: RecipeInterface;
    config: TypeNormalisedInput;
    recipeId: string;
    isInServerlessEnv: boolean;
    req: BaseRequest;
    res: BaseResponse;
};
export declare type APIInterface = {
    createCodePOST?: (
        input: (
            | {
                  email: string;
              }
            | {
                  phoneNumber: string;
              }
        ) & {
            options: APIOptions;
        },
        userContext: any
    ) => Promise<
        | {
              status: "OK";
              deviceId: string;
              preAuthSessionId: string;
              flowType: "USER_INPUT_CODE" | "MAGIC_LINK" | "USER_INPUT_CODE_AND_MAGIC_LINK";
          }
        | {
              status: "GENERAL_ERROR";
              message: string;
          }
    >;
    resendCodePOST?: (
        input: {
            deviceId: string;
            preAuthSessionId: string;
        } & {
            options: APIOptions;
        },
        userContext: any
    ) => Promise<
        | {
              status: "GENERAL_ERROR";
              message: string;
          }
        | {
              status: "RESTART_FLOW_ERROR" | "OK";
          }
    >;
    consumeCodePOST?: (
        input: (
            | {
                  userInputCode: string;
                  deviceId: string;
                  preAuthSessionId: string;
              }
            | {
                  linkCode: string;
                  preAuthSessionId: string;
              }
        ) & {
            options: APIOptions;
        },
        userContext: any
    ) => Promise<
        | {
              status: "OK";
              createdNewUser: boolean;
              user: User;
              session: SessionContainerInterface;
          }
        | {
              status: "INCORRECT_USER_INPUT_CODE_ERROR" | "EXPIRED_USER_INPUT_CODE_ERROR";
              failedCodeInputAttemptCount: number;
              maximumCodeInputAttempts: number;
          }
        | {
              status: "GENERAL_ERROR";
              message: string;
          }
        | {
              status: "RESTART_FLOW_ERROR";
          }
    >;
    emailExistsGET?: (
        input: {
            email: string;
            options: APIOptions;
        },
        userContext: any
    ) => Promise<{
        status: "OK";
        exists: boolean;
    }>;
    phoneNumberExistsGET?: (
        input: {
            phoneNumber: string;
            options: APIOptions;
        },
        userContext: any
    ) => Promise<{
        status: "OK";
        exists: boolean;
    }>;
};
export {};
