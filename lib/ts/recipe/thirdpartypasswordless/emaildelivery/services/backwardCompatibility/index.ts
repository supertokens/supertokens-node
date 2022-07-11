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
import { TypeThirdPartyPasswordlessEmailDeliveryInput, User, RecipeInterface } from "../../../types";
import { User as EmailVerificationUser } from "../../../../emailverification/types";
import { NormalisedAppinfo } from "../../../../../types";
import EmailVerificationBackwardCompatibilityService from "../../../../emailverification/emaildelivery/services/backwardCompatibility";
import PasswordlessBackwardCompatibilityService from "../../../../passwordless/emaildelivery/services/backwardCompatibility";
import { EmailDeliveryInterface } from "../../../../../ingredients/emaildelivery/types";

export default class BackwardCompatibilityService
    implements EmailDeliveryInterface<TypeThirdPartyPasswordlessEmailDeliveryInput> {
    private recipeInterfaceImpl: RecipeInterface;
    private isInServerlessEnv: boolean;
    private appInfo: NormalisedAppinfo;
    private emailVerificationBackwardCompatibilityService: EmailVerificationBackwardCompatibilityService;
    private passwordlessBackwardCompatibilityService: PasswordlessBackwardCompatibilityService;

    constructor(
        recipeInterfaceImpl: RecipeInterface,
        appInfo: NormalisedAppinfo,
        isInServerlessEnv: boolean,
        passwordlessFeature?: {
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
        },
        emailVerificationFeature?: {
            createAndSendCustomEmail?: (
                user: User,
                emailVerificationURLWithToken: string,
                userContext: any
            ) => Promise<void>;
        }
    ) {
        this.recipeInterfaceImpl = recipeInterfaceImpl;
        this.isInServerlessEnv = isInServerlessEnv;
        this.appInfo = appInfo;
        {
            const inputCreateAndSendCustomEmail = emailVerificationFeature?.createAndSendCustomEmail;
            let emailVerificationFeatureNormalisedConfig =
                inputCreateAndSendCustomEmail !== undefined
                    ? {
                          createAndSendCustomEmail: async (
                              user: EmailVerificationUser,
                              link: string,
                              userContext: any
                          ) => {
                              let userInfo = await this.recipeInterfaceImpl.getUserById({
                                  userId: user.id,
                                  userContext,
                              });
                              if (userInfo === undefined) {
                                  throw new Error("Unknown User ID provided");
                              }
                              return await inputCreateAndSendCustomEmail(userInfo, link, userContext);
                          },
                      }
                    : {};
            this.emailVerificationBackwardCompatibilityService = new EmailVerificationBackwardCompatibilityService(
                this.appInfo,
                this.isInServerlessEnv,
                emailVerificationFeatureNormalisedConfig.createAndSendCustomEmail
            );
        }
        {
            this.passwordlessBackwardCompatibilityService = new PasswordlessBackwardCompatibilityService(
                appInfo,
                passwordlessFeature?.createAndSendCustomEmail
            );
        }
    }

    sendEmail = async (input: TypeThirdPartyPasswordlessEmailDeliveryInput & { userContext: any }) => {
        if (input.type === "EMAIL_VERIFICATION") {
            await this.emailVerificationBackwardCompatibilityService.sendEmail(input);
        } else {
            await this.passwordlessBackwardCompatibilityService.sendEmail(input);
        }
    };
}
