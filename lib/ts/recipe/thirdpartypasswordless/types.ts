/* Copyright (c) 2021, VRAI Labs and/or its affiliates. All rights reserved.
 *
 * This software is licensed under the Apache License, Version 2.0 (the
 * "License") as published by the Apache Software Foundation.
 *
 * You may not use this file except in compliance with the License. You may
 * obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
 * WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
 * License for the specific language governing permissions and limitations
 * under the License.
 */
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
import { TypeInput as EmailDeliveryTypeInput } from "../../ingredients/emaildelivery/types";
import {
    TypeInput as SmsDeliveryTypeInput,
    TypeInputWithService as SmsDeliveryTypeInputWithService,
} from "../../ingredients/smsdelivery/types";

export type DeviceType = DeviceTypeOriginal;

export type User = (
    | {
          // passwordless user properties
          email?: string;
          phoneNumber?: string;
      }
    | {
          // third party user properties
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

export type TypeInputEmailVerificationFeature = {
    getEmailVerificationURL?: (user: User, userContext: any) => Promise<string>;
    /**
     * @deprecated Please use emailDelivery config instead
     */
    createAndSendCustomEmail?: (user: User, emailVerificationURLWithToken: string, userContext: any) => Promise<void>;
};

export type TypeInput = (
    | {
          contactMethod: "PHONE";
          validatePhoneNumber?: (phoneNumber: string) => Promise<string | undefined> | string | undefined;

          // Override to use custom template/contact method
          /**
           * @deprecated Please use smsDelivery config instead
           */
          createAndSendCustomTextMessage: (
              input: {
                  // Where the message should be delivered.
                  phoneNumber: string;
                  // This has to be entered on the starting device  to finish sign in/up
                  userInputCode?: string;
                  // Full url that the end-user can click to finish sign in/up
                  urlWithLinkCode?: string;
                  codeLifetime: number;
                  // Unlikely, but someone could display this (or a derived thing) to identify the device
                  preAuthSessionId: string;
              },
              userContext: any
          ) => Promise<void>;
      }
    | {
          contactMethod: "EMAIL";
          validateEmailAddress?: (email: string) => Promise<string | undefined> | string | undefined;

          // Override to use custom template/contact method
          /**
           * @deprecated Please use emailDelivery config instead
           */
          createAndSendCustomEmail: (
              input: {
                  // Where the message should be delivered.
                  email: string;
                  // This has to be entered on the starting device  to finish sign in/up
                  userInputCode?: string;
                  // Full url that the end-user can click to finish sign in/up
                  urlWithLinkCode?: string;
                  codeLifetime: number;
                  // Unlikely, but someone could display this (or a derived thing) to identify the device
                  preAuthSessionId: string;
              },
              userContext: any
          ) => Promise<void>;
      }
    | {
          contactMethod: "EMAIL_OR_PHONE";
          validateEmailAddress?: (email: string) => Promise<string | undefined> | string | undefined;

          // Override to use custom template/contact method
          /**
           * @deprecated Please use emailDelivery config instead
           */
          createAndSendCustomEmail: (
              input: {
                  // Where the message should be delivered.
                  email: string;
                  // This has to be entered on the starting device  to finish sign in/up
                  userInputCode?: string;
                  // Full url that the end-user can click to finish sign in/up
                  urlWithLinkCode?: string;
                  codeLifetime: number;
                  // Unlikely, but someone could display this (or a derived thing) to identify the device
                  preAuthSessionId: string;
              },
              userContext: any
          ) => Promise<void>;
          validatePhoneNumber?: (phoneNumber: string) => Promise<string | undefined> | string | undefined;

          // Override to use custom template/contact method
          /**
           * @deprecated Please use smsDelivery config instead
           */
          createAndSendCustomTextMessage: (
              input: {
                  // Where the message should be delivered.
                  phoneNumber: string;
                  // This has to be entered on the starting device  to finish sign in/up
                  userInputCode?: string;
                  // Full url that the end-user can click to finish sign in/up
                  urlWithLinkCode?: string;
                  codeLifetime: number;
                  // Unlikely, but someone could display this (or a derived thing) to identify the device
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

    // Customize information in the URL.
    // By default: `${websiteDomain}/auth/verify`
    // `?rid=passwordless&preAuthSessionId=${preAuthSessionId}#${linkCode}` will be added after it.
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

    // Override this to override how user input codes are generated
    // By default (=undefined) it is done in the Core
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

export type TypeNormalisedInput = (
    | {
          contactMethod: "PHONE";
          validatePhoneNumber?: (phoneNumber: string) => Promise<string | undefined> | string | undefined;

          // Override to use custom template/contact method
          createAndSendCustomTextMessage: (
              input: {
                  // Where the message should be delivered.
                  phoneNumber: string;
                  // This has to be entered on the starting device  to finish sign in/up
                  userInputCode?: string;
                  // Full url that the end-user can click to finish sign in/up
                  urlWithLinkCode?: string;
                  codeLifetime: number;
                  // Unlikely, but someone could display this (or a derived thing) to identify the device
                  preAuthSessionId: string;
              },
              userContext: any
          ) => Promise<void>;
      }
    | {
          contactMethod: "EMAIL";
          validateEmailAddress?: (email: string) => Promise<string | undefined> | string | undefined;

          // Override to use custom template/contact method
          createAndSendCustomEmail: (
              input: {
                  // Where the message should be delivered.
                  email: string;
                  // This has to be entered on the starting device  to finish sign in/up
                  userInputCode?: string;
                  // Full url that the end-user can click to finish sign in/up
                  urlWithLinkCode?: string;
                  codeLifetime: number;
                  // Unlikely, but someone could display this (or a derived thing) to identify the device
                  preAuthSessionId: string;
              },
              userContext: any
          ) => Promise<void>;
      }
    | {
          contactMethod: "EMAIL_OR_PHONE";
          validateEmailAddress?: (email: string) => Promise<string | undefined> | string | undefined;

          // Override to use custom template/contact method
          createAndSendCustomEmail: (
              input: {
                  // Where the message should be delivered.
                  email: string;
                  // This has to be entered on the starting device  to finish sign in/up
                  userInputCode?: string;
                  // Full url that the end-user can click to finish sign in/up
                  urlWithLinkCode?: string;
                  codeLifetime: number;
                  // Unlikely, but someone could display this (or a derived thing) to identify the device
                  preAuthSessionId: string;
              },
              userContext: any
          ) => Promise<void>;
          validatePhoneNumber?: (phoneNumber: string) => Promise<string | undefined> | string | undefined;

          // Override to use custom template/contact method
          createAndSendCustomTextMessage: (
              input: {
                  // Where the message should be delivered.
                  phoneNumber: string;
                  // This has to be entered on the starting device  to finish sign in/up
                  userInputCode?: string;
                  // Full url that the end-user can click to finish sign in/up
                  urlWithLinkCode?: string;
                  codeLifetime: number;
                  // Unlikely, but someone could display this (or a derived thing) to identify the device
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

    // Override this to override how user input codes are generated
    // By default (=undefined) it is done in the Core
    getCustomUserInputCode?: (userContext: any) => Promise<string> | string;
    providers: TypeProvider[];
    emailVerificationFeature: TypeInputEmailVerification;
    getEmailDeliveryConfig: (
        recipeImpl: RecipeInterface,
        isInServerlessEnv: boolean
    ) => EmailDeliveryTypeInput<TypeThirdPartyPasswordlessEmailDeliveryInput>;
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

export type RecipeInterface = {
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
    }): Promise<
        | { status: "OK"; createdNewUser: boolean; user: User }
        | {
              status: "FIELD_ERROR";
              error: string;
          }
    >;

    createCode: (
        input: (
            | {
                  email: string;
              }
            | {
                  phoneNumber: string;
              }
        ) & { userInputCode?: string; userContext: any }
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
        | { status: "RESTART_FLOW_ERROR" | "USER_INPUT_CODE_ALREADY_USED_ERROR" }
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
        | { status: "RESTART_FLOW_ERROR" }
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

export type PasswordlessAPIOptions = PasswordlessAPIOptionsOriginal;

export type ThirdPartyAPIOptions = ThirdPartyAPIOptionsOriginal;
export type APIInterface = {
    authorisationUrlGET:
        | undefined
        | ((input: {
              provider: TypeProvider;
              options: ThirdPartyAPIOptions;
              userContext: any;
          }) => Promise<{
              status: "OK";
              url: string;
          }>);

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
              | {
                    status: "FIELD_ERROR";
                    error: string;
                }
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
              input: ({ email: string } | { phoneNumber: string }) & {
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
              | { status: "GENERAL_ERROR"; message: string }
          >);

    resendCodePOST:
        | undefined
        | ((
              input: { deviceId: string; preAuthSessionId: string } & {
                  options: PasswordlessAPIOptions;
                  userContext: any;
              }
          ) => Promise<{ status: "GENERAL_ERROR"; message: string } | { status: "RESTART_FLOW_ERROR" | "OK" }>);

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
              | { status: "GENERAL_ERROR"; message: string }
              | { status: "RESTART_FLOW_ERROR" }
          >);

    passwordlessUserEmailExistsGET:
        | undefined
        | ((input: {
              email: string;
              options: PasswordlessAPIOptions;
              userContext: any;
          }) => Promise<{
              status: "OK";
              exists: boolean;
          }>);

    passwordlessUserPhoneNumberExistsGET:
        | undefined
        | ((input: {
              phoneNumber: string;
              options: PasswordlessAPIOptions;
              userContext: any;
          }) => Promise<{
              status: "OK";
              exists: boolean;
          }>);
};

export type TypeThirdPartyPasswordlessEmailDeliveryInput =
    | TypeThirdPartyEmailDeliveryInput
    | TypePasswordlessEmailDeliveryInput;

export type TypeThirdPartyPasswordlessSmsDeliveryInput = TypePasswordlessSmsDeliveryInput;
