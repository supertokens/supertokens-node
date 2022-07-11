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
import { TypeEmailPasswordEmailDeliveryInput, User, RecipeInterface } from "../../../types";
import { User as EmailVerificationUser } from "../../../../emailverification/types";
import { createAndSendCustomEmail as defaultCreateAndSendCustomEmail } from "../../../passwordResetFunctions";
import { NormalisedAppinfo } from "../../../../../types";
import EmailVerificationBackwardCompatibilityService from "../../../../emailverification/emaildelivery/services/backwardCompatibility";
import { EmailDeliveryInterface } from "../../../../../ingredients/emaildelivery/types";

export default class BackwardCompatibilityService
    implements EmailDeliveryInterface<TypeEmailPasswordEmailDeliveryInput> {
    private recipeInterfaceImpl: RecipeInterface;
    private isInServerlessEnv: boolean;
    private appInfo: NormalisedAppinfo;
    private resetPasswordUsingTokenFeature: {
        createAndSendCustomEmail: (user: User, passwordResetURLWithToken: string, userContext: any) => Promise<void>;
    };
    private emailVerificationBackwardCompatibilityService: EmailVerificationBackwardCompatibilityService;

    constructor(
        recipeInterfaceImpl: RecipeInterface,
        appInfo: NormalisedAppinfo,
        isInServerlessEnv: boolean,
        resetPasswordUsingTokenFeature?: {
            createAndSendCustomEmail?: (
                user: User,
                passwordResetURLWithToken: string,
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
            let inputCreateAndSendCustomEmail = resetPasswordUsingTokenFeature?.createAndSendCustomEmail;
            this.resetPasswordUsingTokenFeature =
                inputCreateAndSendCustomEmail !== undefined
                    ? {
                          createAndSendCustomEmail: inputCreateAndSendCustomEmail,
                      }
                    : {
                          createAndSendCustomEmail: defaultCreateAndSendCustomEmail(this.appInfo),
                      };
        }
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
    }

    sendEmail = async (input: TypeEmailPasswordEmailDeliveryInput & { userContext: any }) => {
        if (input.type === "EMAIL_VERIFICATION") {
            await this.emailVerificationBackwardCompatibilityService.sendEmail(input);
        } else {
            let user = await this.recipeInterfaceImpl.getUserById({
                userId: input.user.id,
                userContext: input.userContext,
            });
            if (user === undefined) {
                throw Error("this should never come here");
            }
            try {
                if (!this.isInServerlessEnv) {
                    this.resetPasswordUsingTokenFeature
                        .createAndSendCustomEmail(user, input.passwordResetLink, input.userContext)
                        .catch((_) => {});
                } else {
                    // see https://github.com/supertokens/supertokens-node/pull/135
                    await this.resetPasswordUsingTokenFeature.createAndSendCustomEmail(
                        user,
                        input.passwordResetLink,
                        input.userContext
                    );
                }
            } catch (_) {}
        }
    };
}
