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

import Recipe from "./recipe";
import SuperTokensError from "./error";
import {
    RecipeInterface,
    APIInterface,
    PasswordlessAPIOptions,
    ThirdPartyAPIOptions,
    TypeThirdPartyPasswordlessEmailDeliveryInput,
} from "./types";
import { TypeProvider } from "../thirdparty/types";
import { TypePasswordlessSmsDeliveryInput } from "../passwordless/types";
import RecipeUserId from "../../recipeUserId";
import { getRequestFromUserContext } from "../..";
import { getUserContext } from "../../utils";
import { SessionContainerInterface } from "../session/types";
import { User } from "../../types";

export default class Wrapper {
    static init = Recipe.init;

    static Error = SuperTokensError;

    static async thirdPartyGetProvider(
        tenantId: string,
        thirdPartyId: string,
        clientType: string | undefined,
        userContext?: Record<string, any>
    ) {
        return await Recipe.getInstanceOrThrowError().recipeInterfaceImpl.thirdPartyGetProvider({
            thirdPartyId,
            tenantId,
            clientType,
            userContext: getUserContext(userContext),
        });
    }

    static thirdPartyManuallyCreateOrUpdateUser(
        tenantId: string,
        thirdPartyId: string,
        thirdPartyUserId: string,
        email: string,
        isVerified: boolean,
        session?: undefined,
        userContext?: Record<string, any>
    ): Promise<
        | {
              status: "OK";
              createdNewRecipeUser: boolean;
              user: User;
              recipeUserId: RecipeUserId;
          }
        | {
              status: "EMAIL_CHANGE_NOT_ALLOWED_ERROR";
              reason: string;
          }
        | {
              status: "SIGN_IN_UP_NOT_ALLOWED";
              reason: string;
          }
    >;
    static thirdPartyManuallyCreateOrUpdateUser(
        tenantId: string,
        thirdPartyId: string,
        thirdPartyUserId: string,
        email: string,
        isVerified: boolean,
        session: SessionContainerInterface,
        userContext?: Record<string, any>
    ): Promise<
        | {
              status: "OK";
              createdNewRecipeUser: boolean;
              user: User;
              recipeUserId: RecipeUserId;
          }
        | {
              status: "EMAIL_CHANGE_NOT_ALLOWED_ERROR";
              reason: string;
          }
        | {
              status: "SIGN_IN_UP_NOT_ALLOWED";
              reason: string;
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
    static thirdPartyManuallyCreateOrUpdateUser(
        tenantId: string,
        thirdPartyId: string,
        thirdPartyUserId: string,
        email: string,
        isVerified: boolean,
        session?: SessionContainerInterface,
        userContext?: Record<string, any>
    ): Promise<
        | {
              status: "OK";
              createdNewRecipeUser: boolean;
              user: User;
              recipeUserId: RecipeUserId;
          }
        | {
              status: "EMAIL_CHANGE_NOT_ALLOWED_ERROR";
              reason: string;
          }
        | {
              status: "SIGN_IN_UP_NOT_ALLOWED";
              reason: string;
          }
        | {
              status: "LINKING_TO_SESSION_USER_FAILED";
              reason:
                  | "EMAIL_VERIFICATION_REQUIRED"
                  | "RECIPE_USER_ID_ALREADY_LINKED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR"
                  | "ACCOUNT_INFO_ALREADY_ASSOCIATED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR"
                  | "SESSION_USER_ACCOUNT_INFO_ALREADY_ASSOCIATED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR";
          }
    > {
        return Recipe.getInstanceOrThrowError().recipeInterfaceImpl.thirdPartyManuallyCreateOrUpdateUser({
            thirdPartyId,
            thirdPartyUserId,
            email,
            isVerified,
            tenantId,
            session,
            userContext: getUserContext(userContext),
        });
    }

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
            session?: SessionContainerInterface;
            tenantId: string;
            userContext?: Record<string, any>;
        }
    ) {
        return Recipe.getInstanceOrThrowError().recipeInterfaceImpl.createCode({
            ...input,
            session: input.session,
            userContext: getUserContext(input.userContext),
        });
    }

    static createNewCodeForDevice(input: {
        deviceId: string;
        userInputCode?: string;
        tenantId: string;
        userContext?: Record<string, any>;
    }) {
        return Recipe.getInstanceOrThrowError().recipeInterfaceImpl.createNewCodeForDevice({
            ...input,
            userContext: getUserContext(input.userContext),
        });
    }

    /**
     * 1. verifies the code
     * 2. creates the user if it doesn't exist
     * 3. tries to link it
     * 4. marks the email as verified
     */
    static consumeCode(
        input:
            | {
                  preAuthSessionId: string;
                  userInputCode: string;
                  deviceId: string;
                  session?: undefined;
                  tenantId: string;
                  userContext?: Record<string, any>;
              }
            | {
                  preAuthSessionId: string;
                  linkCode: string;
                  session?: undefined;
                  tenantId: string;
                  userContext?: Record<string, any>;
              }
    ): Promise<
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
        | { status: "RESTART_FLOW_ERROR" }
    >;
    static consumeCode(
        input:
            | {
                  preAuthSessionId: string;
                  userInputCode: string;
                  deviceId: string;
                  session: SessionContainerInterface;
                  tenantId: string;
                  userContext?: Record<string, any>;
              }
            | {
                  preAuthSessionId: string;
                  linkCode: string;
                  session: SessionContainerInterface;
                  tenantId: string;
                  userContext?: Record<string, any>;
              }
    ): Promise<
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
        | { status: "RESTART_FLOW_ERROR" }
        | {
              status: "LINKING_TO_SESSION_USER_FAILED";
              reason:
                  | "EMAIL_VERIFICATION_REQUIRED"
                  | "RECIPE_USER_ID_ALREADY_LINKED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR"
                  | "ACCOUNT_INFO_ALREADY_ASSOCIATED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR"
                  | "SESSION_USER_ACCOUNT_INFO_ALREADY_ASSOCIATED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR";
          }
    >;
    static consumeCode(
        input:
            | {
                  preAuthSessionId: string;
                  userInputCode: string;
                  deviceId: string;
                  session?: SessionContainerInterface;
                  tenantId: string;
                  userContext?: Record<string, any>;
              }
            | {
                  preAuthSessionId: string;
                  linkCode: string;
                  session?: SessionContainerInterface;
                  tenantId: string;
                  userContext?: Record<string, any>;
              }
    ): Promise<
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
        | { status: "RESTART_FLOW_ERROR" }
        | {
              status: "LINKING_TO_SESSION_USER_FAILED";
              reason:
                  | "EMAIL_VERIFICATION_REQUIRED"
                  | "RECIPE_USER_ID_ALREADY_LINKED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR"
                  | "ACCOUNT_INFO_ALREADY_ASSOCIATED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR"
                  | "SESSION_USER_ACCOUNT_INFO_ALREADY_ASSOCIATED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR";
          }
    > {
        return Recipe.getInstanceOrThrowError().recipeInterfaceImpl.consumeCode({
            ...input,
            session: input.session,
            userContext: getUserContext(input.userContext),
        });
    }

    /**
     * This function will only verify the code (not consume it), and:
     * NOT create a new user if it doesn't exist
     * NOT verify the user email if it exists
     * NOT do any linking
     * NOT delete the code unless it returned RESTART_FLOW_ERROR
     */
    static checkCode(
        input:
            | {
                  preAuthSessionId: string;
                  userInputCode: string;
                  deviceId: string;
                  tenantId: string;
                  userContext?: Record<string, any>;
              }
            | {
                  preAuthSessionId: string;
                  linkCode: string;
                  tenantId: string;
                  userContext?: Record<string, any>;
              }
    ): Promise<
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
        | { status: "RESTART_FLOW_ERROR" }
    > {
        return Recipe.getInstanceOrThrowError().recipeInterfaceImpl.checkCode({
            ...input,
            userContext: getUserContext(input.userContext),
        });
    }

    static updatePasswordlessUser(input: {
        recipeUserId: RecipeUserId;
        email?: string | null;
        phoneNumber?: string | null;
        userContext?: Record<string, any>;
    }) {
        return Recipe.getInstanceOrThrowError().recipeInterfaceImpl.updatePasswordlessUser({
            ...input,
            userContext: getUserContext(input.userContext),
        });
    }

    static revokeAllCodes(
        input:
            | {
                  email: string;
                  tenantId: string;
                  userContext?: Record<string, any>;
              }
            | {
                  phoneNumber: string;
                  tenantId: string;
                  userContext?: Record<string, any>;
              }
    ) {
        return Recipe.getInstanceOrThrowError().recipeInterfaceImpl.revokeAllCodes({
            ...input,
            userContext: getUserContext(input.userContext),
        });
    }

    static revokeCode(input: { codeId: string; tenantId: string; userContext?: Record<string, any> }) {
        return Recipe.getInstanceOrThrowError().recipeInterfaceImpl.revokeCode({
            ...input,
            userContext: getUserContext(input.userContext),
        });
    }

    static listCodesByEmail(input: { email: string; tenantId: string; userContext?: Record<string, any> }) {
        return Recipe.getInstanceOrThrowError().recipeInterfaceImpl.listCodesByEmail({
            ...input,
            userContext: getUserContext(input.userContext),
        });
    }

    static listCodesByPhoneNumber(input: { phoneNumber: string; tenantId: string; userContext?: Record<string, any> }) {
        return Recipe.getInstanceOrThrowError().recipeInterfaceImpl.listCodesByPhoneNumber({
            ...input,
            userContext: getUserContext(input.userContext),
        });
    }

    static listCodesByDeviceId(input: { deviceId: string; tenantId: string; userContext?: Record<string, any> }) {
        return Recipe.getInstanceOrThrowError().recipeInterfaceImpl.listCodesByDeviceId({
            ...input,
            userContext: getUserContext(input.userContext),
        });
    }

    static listCodesByPreAuthSessionId(input: {
        preAuthSessionId: string;
        tenantId: string;
        userContext?: Record<string, any>;
    }) {
        return Recipe.getInstanceOrThrowError().recipeInterfaceImpl.listCodesByPreAuthSessionId({
            ...input,
            userContext: getUserContext(input.userContext),
        });
    }

    static createMagicLink(
        input:
            | {
                  email: string;
                  tenantId: string;
                  userContext?: Record<string, any>;
              }
            | {
                  phoneNumber: string;
                  tenantId: string;
                  userContext?: Record<string, any>;
              }
    ) {
        const ctx = getUserContext(input.userContext);
        return Recipe.getInstanceOrThrowError().passwordlessRecipe.createMagicLink({
            ...input,
            request: getRequestFromUserContext(ctx),
            userContext: getUserContext(ctx),
        });
    }

    static passwordlessSignInUp(
        input:
            | {
                  email: string;
                  tenantId: string;
                  session?: SessionContainerInterface;
                  userContext?: Record<string, any>;
              }
            | {
                  phoneNumber: string;
                  tenantId: string;
                  session?: SessionContainerInterface;
                  userContext?: Record<string, any>;
              }
    ) {
        return Recipe.getInstanceOrThrowError().passwordlessRecipe.signInUp({
            ...input,
            userContext: getUserContext(input.userContext),
        });
    }

    static async sendEmail(
        input: TypeThirdPartyPasswordlessEmailDeliveryInput & { userContext?: Record<string, any> }
    ) {
        return await Recipe.getInstanceOrThrowError().emailDelivery.ingredientInterfaceImpl.sendEmail({
            ...input,
            userContext: getUserContext(input.userContext),
        });
    }

    static async sendSms(input: TypePasswordlessSmsDeliveryInput & { userContext?: Record<string, any> }) {
        return await Recipe.getInstanceOrThrowError().smsDelivery.ingredientInterfaceImpl.sendSms({
            ...input,
            userContext: getUserContext(input.userContext),
        });
    }
}

export let init = Wrapper.init;

export let Error = Wrapper.Error;

export let thirdPartyGetProvider = Wrapper.thirdPartyGetProvider;

export let thirdPartyManuallyCreateOrUpdateUser = Wrapper.thirdPartyManuallyCreateOrUpdateUser;

export let passwordlessSignInUp = Wrapper.passwordlessSignInUp;

export let createCode = Wrapper.createCode;

export let consumeCode = Wrapper.consumeCode;

export let listCodesByDeviceId = Wrapper.listCodesByDeviceId;

export let listCodesByEmail = Wrapper.listCodesByEmail;

export let listCodesByPhoneNumber = Wrapper.listCodesByPhoneNumber;

export let listCodesByPreAuthSessionId = Wrapper.listCodesByPreAuthSessionId;

export let createNewCodeForDevice = Wrapper.createNewCodeForDevice;

export let updatePasswordlessUser = Wrapper.updatePasswordlessUser;

export let revokeAllCodes = Wrapper.revokeAllCodes;

export let revokeCode = Wrapper.revokeCode;

export let checkCode = Wrapper.checkCode;

export let createMagicLink = Wrapper.createMagicLink;

export type { RecipeInterface, TypeProvider, APIInterface, PasswordlessAPIOptions, ThirdPartyAPIOptions };

export let sendEmail = Wrapper.sendEmail;

export let sendSms = Wrapper.sendSms;
