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

import { BaseRequest, BaseResponse } from "../../framework";
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
import { GeneralErrorResponse, NormalisedAppinfo } from "../../types";

// As per https://github.com/supertokens/supertokens-core/issues/325

export type User = {
    id: string;
    email?: string;
    phoneNumber?: string;
    timeJoined: number;
    tenantIds: string[];
};

export type TypeInput = (
    | {
          contactMethod: "PHONE";
          validatePhoneNumber?: (phoneNumber: string) => Promise<string | undefined> | string | undefined;

          // Override to use custom template/contact method
          /**
           * @deprecated Please use smsDelivery config instead
           */
          createAndSendCustomTextMessage?: (
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
          createAndSendCustomEmail?: (
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
          createAndSendCustomEmail?: (
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
          createAndSendCustomTextMessage?: (
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

    emailDelivery?: EmailDeliveryTypeInput<TypePasswordlessEmailDeliveryInput>;
    smsDelivery?: SmsDeliveryTypeInput<TypePasswordlessSmsDeliveryInput>;

    // Override this to override how user input codes are generated
    // By default (=undefined) it is done in the Core
    getCustomUserInputCode?: (userContext: any) => Promise<string> | string;

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
          validatePhoneNumber: (phoneNumber: string) => Promise<string | undefined> | string | undefined;
      }
    | {
          contactMethod: "EMAIL";
          validateEmailAddress: (email: string) => Promise<string | undefined> | string | undefined;
      }
    | {
          contactMethod: "EMAIL_OR_PHONE";
          validateEmailAddress: (email: string) => Promise<string | undefined> | string | undefined;

          validatePhoneNumber: (phoneNumber: string) => Promise<string | undefined> | string | undefined;
      }
) & {
    flowType: "USER_INPUT_CODE" | "MAGIC_LINK" | "USER_INPUT_CODE_AND_MAGIC_LINK";

    // Override this to override how user input codes are generated
    // By default (=undefined) it is done in the Core
    getCustomUserInputCode?: (userContext: any) => Promise<string> | string;

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
        ) & { userInputCode?: string; tenantId: string; userContext: any }
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
                  tenantId: string;
                  userContext: any;
              }
            | {
                  linkCode: string;
                  preAuthSessionId: string;
                  tenantId: string;
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

    getUserById: (input: { userId: string; userContext: any }) => Promise<User | undefined>;
    getUserByEmail: (input: { email: string; tenantId: string; userContext: any }) => Promise<User | undefined>;
    getUserByPhoneNumber: (input: {
        phoneNumber: string;
        tenantId: string;
        userContext: any;
    }) => Promise<User | undefined>;

    updateUser: (input: {
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
                  tenantId: string;
                  userContext: any;
              }
            | {
                  phoneNumber: string;
                  tenantId: string;
                  userContext: any;
              }
    ) => Promise<{
        status: "OK";
    }>;

    revokeCode: (input: {
        codeId: string;
        tenantId: string;
        userContext: any;
    }) => Promise<{
        status: "OK";
    }>;

    listCodesByEmail: (input: { email: string; tenantId: string; userContext: any }) => Promise<DeviceType[]>;

    listCodesByPhoneNumber: (input: {
        phoneNumber: string;
        tenantId: string;
        userContext: any;
    }) => Promise<DeviceType[]>;

    listCodesByDeviceId: (input: {
        deviceId: string;
        tenantId: string;
        userContext: any;
    }) => Promise<DeviceType | undefined>;

    listCodesByPreAuthSessionId: (input: {
        preAuthSessionId: string;
        tenantId: string;
        userContext: any;
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
        input: ({ email: string } | { phoneNumber: string }) & {
            tenantId: string;
            options: APIOptions;
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
    >;

    resendCodePOST?: (
        input: { deviceId: string; preAuthSessionId: string } & {
            tenantId: string;
            options: APIOptions;
            userContext: any;
        }
    ) => Promise<GeneralErrorResponse | { status: "RESTART_FLOW_ERROR" | "OK" }>;

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
            options: APIOptions;
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
        | { status: "RESTART_FLOW_ERROR" }
    >;

    emailExistsGET?: (input: {
        email: string;
        tenantId: string;
        options: APIOptions;
        userContext: any;
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
        userContext: any;
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
    email: string;
    userInputCode?: string;
    urlWithLinkCode?: string;
    codeLifetime: number;
    preAuthSessionId: string;
};

export type TypePasswordlessSmsDeliveryInput = {
    type: "PASSWORDLESS_LOGIN";
    phoneNumber: string;
    userInputCode?: string;
    urlWithLinkCode?: string;
    codeLifetime: number;
    preAuthSessionId: string;
};
