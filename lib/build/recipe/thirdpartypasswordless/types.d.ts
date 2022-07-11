// @ts-nocheck
import {
    TypeProvider,
    APIOptions as ThirdPartyAPIOptionsOriginal,
    TypeThirdPartyEmailDeliveryInput,
} from "../thirdparty/types";
import { TypeInput as TypeInputEmailVerification } from "../emailverification/types";
import {
    RecipeInterface as EmailVerificationRecipeInterface,
    APIInterface as EmailVerificationAPIInterface,
} from "../emailverification";
import {
    DeviceType as DeviceTypeOriginal,
    APIOptions as PasswordlessAPIOptionsOriginal,
    TypePasswordlessEmailDeliveryInput,
    TypePasswordlessSmsDeliveryInput,
} from "../passwordless/types";
import OverrideableBuilder from "supertokens-js-override";
import { SessionContainerInterface } from "../session/types";
import {
    TypeInput as EmailDeliveryTypeInput,
    TypeInputWithService as EmailDeliveryTypeInputWithService,
} from "../../ingredients/emaildelivery/types";
import {
    TypeInput as SmsDeliveryTypeInput,
    TypeInputWithService as SmsDeliveryTypeInputWithService,
} from "../../ingredients/smsdelivery/types";
import { GeneralErrorResponse } from "../../types";
export declare type DeviceType = DeviceTypeOriginal;
export declare type User = (
    | {
          email?: string;
          phoneNumber?: string;
      }
    | {
          email: string;
          thirdParty: {
              id: string;
              userId: string;
          };
      }
) & {
    id: string;
    timeJoined: number;
};
export declare type TypeInputEmailVerificationFeature = {
    getEmailVerificationURL?: (user: User, userContext: any) => Promise<string>;
    /**
     * @deprecated Please use emailDelivery config instead
     */
    createAndSendCustomEmail?: (user: User, emailVerificationURLWithToken: string, userContext: any) => Promise<void>;
};
export declare type TypeInput = (
    | {
          contactMethod: "PHONE";
          validatePhoneNumber?: (phoneNumber: string) => Promise<string | undefined> | string | undefined;
          /**
           * @deprecated Please use smsDelivery config instead
           */
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
          /**
           * @deprecated Please use emailDelivery config instead
           */
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
    | {
          contactMethod: "EMAIL_OR_PHONE";
          validateEmailAddress?: (email: string) => Promise<string | undefined> | string | undefined;
          /**
           * @deprecated Please use emailDelivery config instead
           */
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
          validatePhoneNumber?: (phoneNumber: string) => Promise<string | undefined> | string | undefined;
          /**
           * @deprecated Please use smsDelivery config instead
           */
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
) & {
    /**
     * Unlike passwordless recipe, emailDelivery config is outside here because regardless
     * of `contactMethod` value, the config is required for email verification recipe
     */
    emailDelivery?: EmailDeliveryTypeInput<TypeThirdPartyPasswordlessEmailDeliveryInput>;
    smsDelivery?: SmsDeliveryTypeInput<TypePasswordlessSmsDeliveryInput>;
    providers?: TypeProvider[];
    emailVerificationFeature?: TypeInputEmailVerificationFeature;
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
            builder?: OverrideableBuilder<RecipeInterface>
        ) => RecipeInterface;
        apis?: (originalImplementation: APIInterface, builder?: OverrideableBuilder<APIInterface>) => APIInterface;
        emailVerificationFeature?: {
            functions?: (
                originalImplementation: EmailVerificationRecipeInterface,
                builder?: OverrideableBuilder<EmailVerificationRecipeInterface>
            ) => EmailVerificationRecipeInterface;
            apis?: (
                originalImplementation: EmailVerificationAPIInterface,
                builder?: OverrideableBuilder<EmailVerificationAPIInterface>
            ) => EmailVerificationAPIInterface;
        };
    };
};
export declare type TypeNormalisedInput = (
    | {
          contactMethod: "PHONE";
          validatePhoneNumber?: (phoneNumber: string) => Promise<string | undefined> | string | undefined;
      }
    | {
          contactMethod: "EMAIL";
          validateEmailAddress?: (email: string) => Promise<string | undefined> | string | undefined;
      }
    | {
          contactMethod: "EMAIL_OR_PHONE";
          validateEmailAddress?: (email: string) => Promise<string | undefined> | string | undefined;
          validatePhoneNumber?: (phoneNumber: string) => Promise<string | undefined> | string | undefined;
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
    providers: TypeProvider[];
    emailVerificationFeature: TypeInputEmailVerification;
    getEmailDeliveryConfig: (
        recipeImpl: RecipeInterface,
        isInServerlessEnv: boolean
    ) => EmailDeliveryTypeInputWithService<TypeThirdPartyPasswordlessEmailDeliveryInput>;
    getSmsDeliveryConfig: () => SmsDeliveryTypeInputWithService<TypeThirdPartyPasswordlessSmsDeliveryInput>;
    override: {
        functions: (
            originalImplementation: RecipeInterface,
            builder?: OverrideableBuilder<RecipeInterface>
        ) => RecipeInterface;
        apis: (originalImplementation: APIInterface, builder?: OverrideableBuilder<APIInterface>) => APIInterface;
        emailVerificationFeature?: {
            functions?: (
                originalImplementation: EmailVerificationRecipeInterface,
                builder?: OverrideableBuilder<EmailVerificationRecipeInterface>
            ) => EmailVerificationRecipeInterface;
            apis?: (
                originalImplementation: EmailVerificationAPIInterface,
                builder?: OverrideableBuilder<EmailVerificationAPIInterface>
            ) => EmailVerificationAPIInterface;
        };
    };
};
export declare type RecipeInterface = {
    getUserById(input: { userId: string; userContext: any }): Promise<User | undefined>;
    getUsersByEmail(input: { email: string; userContext: any }): Promise<User[]>;
    getUserByPhoneNumber: (input: { phoneNumber: string; userContext: any }) => Promise<User | undefined>;
    getUserByThirdPartyInfo(input: {
        thirdPartyId: string;
        thirdPartyUserId: string;
        userContext: any;
    }): Promise<User | undefined>;
    thirdPartySignInUp(input: {
        thirdPartyId: string;
        thirdPartyUserId: string;
        email: {
            id: string;
            isVerified: boolean;
        };
        userContext: any;
    }): Promise<{
        status: "OK";
        createdNewUser: boolean;
        user: User;
    }>;
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
            userContext: any;
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
        userContext: any;
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
                  userContext: any;
              }
            | {
                  linkCode: string;
                  preAuthSessionId: string;
                  userContext: any;
              }
    ) => Promise<
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
    updatePasswordlessUser: (input: {
        userId: string;
        email?: string | null;
        phoneNumber?: string | null;
        userContext: any;
    }) => Promise<{
        status: "OK" | "UNKNOWN_USER_ID_ERROR" | "EMAIL_ALREADY_EXISTS_ERROR" | "PHONE_NUMBER_ALREADY_EXISTS_ERROR";
    }>;
    revokeAllCodes: (
        input:
            | {
                  email: string;
                  userContext: any;
              }
            | {
                  phoneNumber: string;
                  userContext: any;
              }
    ) => Promise<{
        status: "OK";
    }>;
    revokeCode: (input: {
        codeId: string;
        userContext: any;
    }) => Promise<{
        status: "OK";
    }>;
    listCodesByEmail: (input: { email: string; userContext: any }) => Promise<DeviceType[]>;
    listCodesByPhoneNumber: (input: { phoneNumber: string; userContext: any }) => Promise<DeviceType[]>;
    listCodesByDeviceId: (input: { deviceId: string; userContext: any }) => Promise<DeviceType | undefined>;
    listCodesByPreAuthSessionId: (input: {
        preAuthSessionId: string;
        userContext: any;
    }) => Promise<DeviceType | undefined>;
};
export declare type PasswordlessAPIOptions = PasswordlessAPIOptionsOriginal;
export declare type ThirdPartyAPIOptions = ThirdPartyAPIOptionsOriginal;
export declare type APIInterface = {
    authorisationUrlGET:
        | undefined
        | ((input: {
              provider: TypeProvider;
              options: ThirdPartyAPIOptions;
              userContext: any;
          }) => Promise<
              | {
                    status: "OK";
                    url: string;
                }
              | GeneralErrorResponse
          >);
    thirdPartySignInUpPOST:
        | undefined
        | ((input: {
              provider: TypeProvider;
              code: string;
              redirectURI: string;
              authCodeResponse?: any;
              clientId?: string;
              options: ThirdPartyAPIOptions;
              userContext: any;
          }) => Promise<
              | {
                    status: "OK";
                    createdNewUser: boolean;
                    user: User;
                    session: SessionContainerInterface;
                    authCodeResponse: any;
                }
              | GeneralErrorResponse
              | {
                    status: "NO_EMAIL_GIVEN_BY_PROVIDER";
                }
          >);
    appleRedirectHandlerPOST:
        | undefined
        | ((input: { code: string; state: string; options: ThirdPartyAPIOptions; userContext: any }) => Promise<void>);
    createCodePOST:
        | undefined
        | ((
              input: (
                  | {
                        email: string;
                    }
                  | {
                        phoneNumber: string;
                    }
              ) & {
                  options: PasswordlessAPIOptions;
                  userContext: any;
              }
          ) => Promise<
              | {
                    status: "OK";
                    deviceId: string;
                    preAuthSessionId: string;
                    flowType: "USER_INPUT_CODE" | "MAGIC_LINK" | "USER_INPUT_CODE_AND_MAGIC_LINK";
                }
              | GeneralErrorResponse
          >);
    resendCodePOST:
        | undefined
        | ((
              input: {
                  deviceId: string;
                  preAuthSessionId: string;
              } & {
                  options: PasswordlessAPIOptions;
                  userContext: any;
              }
          ) => Promise<
              | GeneralErrorResponse
              | {
                    status: "RESTART_FLOW_ERROR" | "OK";
                }
          >);
    consumeCodePOST:
        | undefined
        | ((
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
                  options: PasswordlessAPIOptions;
                  userContext: any;
              }
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
              | GeneralErrorResponse
              | {
                    status: "RESTART_FLOW_ERROR";
                }
          >);
    passwordlessUserEmailExistsGET:
        | undefined
        | ((input: {
              email: string;
              options: PasswordlessAPIOptions;
              userContext: any;
          }) => Promise<
              | {
                    status: "OK";
                    exists: boolean;
                }
              | GeneralErrorResponse
          >);
    passwordlessUserPhoneNumberExistsGET:
        | undefined
        | ((input: {
              phoneNumber: string;
              options: PasswordlessAPIOptions;
              userContext: any;
          }) => Promise<
              | {
                    status: "OK";
                    exists: boolean;
                }
              | GeneralErrorResponse
          >);
};
export declare type TypeThirdPartyPasswordlessEmailDeliveryInput =
    | TypeThirdPartyEmailDeliveryInput
    | TypePasswordlessEmailDeliveryInput;
export declare type TypeThirdPartyPasswordlessSmsDeliveryInput = TypePasswordlessSmsDeliveryInput;
