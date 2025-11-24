// @ts-nocheck
import type { BaseRequest, BaseResponse } from "../../framework";
import OverrideableBuilder from "supertokens-js-override";
import { SessionContainerInterface } from "../session/types";
import {
    TypeInput as EmailDeliveryTypeInput,
    TypeInputWithService as EmailDeliveryTypeInputWithService,
} from "../../ingredients/emaildelivery/types";
import EmailDeliveryIngredient from "../../ingredients/emaildelivery";
import {
    TypeInput as SmsDeliveryTypeInput,
    TypeInputWithService as SmsDeliveryTypeInputWithService,
} from "../../ingredients/smsdelivery/types";
import SmsDeliveryIngredient from "../../ingredients/smsdelivery";
import { GeneralErrorResponse, NormalisedAppinfo, User, UserContext } from "../../types";
import RecipeUserId from "../../recipeUserId";
export type TypeInput = (
    | {
          contactMethod: "PHONE";
          validatePhoneNumber?: (
              phoneNumber: string,
              tenantId: string
          ) => Promise<string | undefined> | string | undefined;
      }
    | {
          contactMethod: "EMAIL";
          validateEmailAddress?: (email: string, tenantId: string) => Promise<string | undefined> | string | undefined;
      }
    | {
          contactMethod: "EMAIL_OR_PHONE";
          validateEmailAddress?: (email: string, tenantId: string) => Promise<string | undefined> | string | undefined;
          validatePhoneNumber?: (
              phoneNumber: string,
              tenantId: string
          ) => Promise<string | undefined> | string | undefined;
      }
) & {
    flowType: "USER_INPUT_CODE" | "MAGIC_LINK" | "USER_INPUT_CODE_AND_MAGIC_LINK";
    emailDelivery?: EmailDeliveryTypeInput<TypePasswordlessEmailDeliveryInput>;
    smsDelivery?: SmsDeliveryTypeInput<TypePasswordlessSmsDeliveryInput>;
    getCustomUserInputCode?: (tenantId: string, userContext: UserContext) => Promise<string> | string;
    override?: {
        functions?: (
            originalImplementation: RecipeInterface,
            builder: OverrideableBuilder<RecipeInterface>
        ) => RecipeInterface;
        apis?: (originalImplementation: APIInterface, builder: OverrideableBuilder<APIInterface>) => APIInterface;
    };
};
export type TypeNormalisedInput = (
    | {
          contactMethod: "PHONE";
          validatePhoneNumber: (
              phoneNumber: string,
              tenantId: string
          ) => Promise<string | undefined> | string | undefined;
      }
    | {
          contactMethod: "EMAIL";
          validateEmailAddress: (email: string, tenantId: string) => Promise<string | undefined> | string | undefined;
      }
    | {
          contactMethod: "EMAIL_OR_PHONE";
          validateEmailAddress: (email: string, tenantId: string) => Promise<string | undefined> | string | undefined;
          validatePhoneNumber: (
              phoneNumber: string,
              tenantId: string
          ) => Promise<string | undefined> | string | undefined;
      }
) & {
    flowType: "USER_INPUT_CODE" | "MAGIC_LINK" | "USER_INPUT_CODE_AND_MAGIC_LINK";
    getCustomUserInputCode?: (tenantId: string, userContext: UserContext) => Promise<string> | string;
    getSmsDeliveryConfig: () => SmsDeliveryTypeInputWithService<TypePasswordlessSmsDeliveryInput>;
    getEmailDeliveryConfig: () => EmailDeliveryTypeInputWithService<TypePasswordlessEmailDeliveryInput>;
    override: {
        functions: (
            originalImplementation: RecipeInterface,
            builder: OverrideableBuilder<RecipeInterface>
        ) => RecipeInterface;
        apis: (originalImplementation: APIInterface, builder: OverrideableBuilder<APIInterface>) => APIInterface;
    };
};
export type RecipeInterface = {
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
            session: SessionContainerInterface | undefined;
            shouldTryLinkingWithSessionUser: boolean | undefined;
            tenantId: string;
            userContext: UserContext;
        }
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
    createNewCodeForDevice: (input: {
        deviceId: string;
        userInputCode?: string;
        tenantId: string;
        userContext: UserContext;
    }) => Promise<
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
                  preAuthSessionId: string;
                  session: SessionContainerInterface | undefined;
                  shouldTryLinkingWithSessionUser: boolean | undefined;
                  tenantId: string;
                  userContext: UserContext;
              }
            | {
                  linkCode: string;
                  preAuthSessionId: string;
                  session: SessionContainerInterface | undefined;
                  shouldTryLinkingWithSessionUser: boolean | undefined;
                  tenantId: string;
                  userContext: UserContext;
              }
    ) => Promise<
        | {
              status: "OK";
              consumedDevice: {
                  preAuthSessionId: string;
                  failedCodeInputAttemptCount: number;
                  email?: string;
                  phoneNumber?: string;
              };
              createdNewRecipeUser: boolean;
              user: User;
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
        | {
              status: "LINKING_TO_SESSION_USER_FAILED";
              reason:
                  | "EMAIL_VERIFICATION_REQUIRED"
                  | "RECIPE_USER_ID_ALREADY_LINKED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR"
                  | "ACCOUNT_INFO_ALREADY_ASSOCIATED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR"
                  | "SESSION_USER_ACCOUNT_INFO_ALREADY_ASSOCIATED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR";
          }
    >;
    checkCode: (
        input:
            | {
                  userInputCode: string;
                  deviceId: string;
                  preAuthSessionId: string;
                  tenantId: string;
                  userContext: UserContext;
              }
            | {
                  linkCode: string;
                  preAuthSessionId: string;
                  tenantId: string;
                  userContext: UserContext;
              }
    ) => Promise<
        | {
              status: "OK";
              consumedDevice: {
                  preAuthSessionId: string;
                  failedCodeInputAttemptCount: number;
                  email?: string;
                  phoneNumber?: string;
              };
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
    updateUser: (input: {
        recipeUserId: RecipeUserId;
        email?: string | null;
        phoneNumber?: string | null;
        userContext: UserContext;
    }) => Promise<
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
    revokeAllCodes: (
        input:
            | {
                  email: string;
                  tenantId: string;
                  userContext: UserContext;
              }
            | {
                  phoneNumber: string;
                  tenantId: string;
                  userContext: UserContext;
              }
    ) => Promise<{
        status: "OK";
    }>;
    revokeCode: (
        input:
            | {
                  codeId: string;
                  tenantId: string;
                  userContext: UserContext;
              }
            | {
                  preAuthSessionId: string;
                  tenantId: string;
                  userContext: UserContext;
              }
    ) => Promise<{
        status: "OK";
    }>;
    listCodesByEmail: (input: { email: string; tenantId: string; userContext: UserContext }) => Promise<DeviceType[]>;
    listCodesByPhoneNumber: (input: {
        phoneNumber: string;
        tenantId: string;
        userContext: UserContext;
    }) => Promise<DeviceType[]>;
    listCodesByDeviceId: (input: {
        deviceId: string;
        tenantId: string;
        userContext: UserContext;
    }) => Promise<DeviceType | undefined>;
    listCodesByPreAuthSessionId: (input: {
        preAuthSessionId: string;
        tenantId: string;
        userContext: UserContext;
    }) => Promise<DeviceType | undefined>;
};
export type DeviceType = {
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
export type APIOptions = {
    recipeImplementation: RecipeInterface;
    appInfo: NormalisedAppinfo;
    config: TypeNormalisedInput;
    recipeId: string;
    isInServerlessEnv: boolean;
    req: BaseRequest;
    res: BaseResponse;
    emailDelivery: EmailDeliveryIngredient<TypePasswordlessEmailDeliveryInput>;
    smsDelivery: SmsDeliveryIngredient<TypePasswordlessSmsDeliveryInput>;
};
export type APIInterface = {
    createCodePOST?: (
        input: (
            | {
                  email: string;
              }
            | {
                  phoneNumber: string;
              }
        ) & {
            tenantId: string;
            session: SessionContainerInterface | undefined;
            shouldTryLinkingWithSessionUser: boolean | undefined;
            options: APIOptions;
            userContext: UserContext;
        }
    ) => Promise<
        | {
              status: "OK";
              deviceId: string;
              preAuthSessionId: string;
              flowType: "USER_INPUT_CODE" | "MAGIC_LINK" | "USER_INPUT_CODE_AND_MAGIC_LINK";
          }
        | {
              status: "SIGN_IN_UP_NOT_ALLOWED";
              reason: string;
          }
        | GeneralErrorResponse
    >;
    resendCodePOST?: (
        input: {
            deviceId: string;
            preAuthSessionId: string;
        } & {
            tenantId: string;
            session: SessionContainerInterface | undefined;
            shouldTryLinkingWithSessionUser: boolean | undefined;
            options: APIOptions;
            userContext: UserContext;
        }
    ) => Promise<
        | GeneralErrorResponse
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
            tenantId: string;
            session: SessionContainerInterface | undefined;
            shouldTryLinkingWithSessionUser: boolean | undefined;
            options: APIOptions;
            userContext: UserContext;
        }
    ) => Promise<
        | {
              status: "OK";
              createdNewRecipeUser: boolean;
              user: User;
              session: SessionContainerInterface;
          }
        | {
              status: "INCORRECT_USER_INPUT_CODE_ERROR" | "EXPIRED_USER_INPUT_CODE_ERROR";
              failedCodeInputAttemptCount: number;
              maximumCodeInputAttempts: number;
          }
        | {
              status: "RESTART_FLOW_ERROR";
          }
        | {
              status: "SIGN_IN_UP_NOT_ALLOWED";
              reason: string;
          }
        | GeneralErrorResponse
    >;
    emailExistsGET?: (input: {
        email: string;
        tenantId: string;
        options: APIOptions;
        userContext: UserContext;
    }) => Promise<
        | {
              status: "OK";
              exists: boolean;
          }
        | GeneralErrorResponse
    >;
    phoneNumberExistsGET?: (input: {
        phoneNumber: string;
        tenantId: string;
        options: APIOptions;
        userContext: UserContext;
    }) => Promise<
        | {
              status: "OK";
              exists: boolean;
          }
        | GeneralErrorResponse
    >;
};
export type TypePasswordlessEmailDeliveryInput = {
    type: "PASSWORDLESS_LOGIN";
    isFirstFactor: boolean;
    email: string;
    userInputCode?: string;
    urlWithLinkCode?: string;
    codeLifetime: number;
    preAuthSessionId: string;
    tenantId: string;
};
export type TypePasswordlessSmsDeliveryInput = {
    type: "PASSWORDLESS_LOGIN";
    isFirstFactor: boolean;
    phoneNumber: string;
    userInputCode?: string;
    urlWithLinkCode?: string;
    codeLifetime: number;
    preAuthSessionId: string;
    tenantId: string;
};
