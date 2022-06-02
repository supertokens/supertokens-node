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
import { TypeThirdPartyEmailPasswordEmailDeliveryInput, User, RecipeInterface } from "../../../types";
import { RecipeInterface as EmailPasswordRecipeInterface, User as EmailPasswordUser } from "../../../../emailpassword";
import { NormalisedAppinfo } from "../../../../../types";
import EmailPasswordBackwardCompatibilityService from "../../../../emailpassword/emaildelivery/services/backwardCompatibility";
import { EmailDeliveryInterface } from "../../../../../ingredients/emaildelivery/types";

export default class BackwardCompatibilityService
    implements EmailDeliveryInterface<TypeThirdPartyEmailPasswordEmailDeliveryInput> {
    private emailPasswordBackwardCompatibilityService: EmailPasswordBackwardCompatibilityService;

    constructor(
        recipeInterfaceImpl: RecipeInterface,
        emailPasswordRecipeInterfaceImpl: EmailPasswordRecipeInterface,
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
        const inputCreateAndSendCustomEmail = emailVerificationFeature?.createAndSendCustomEmail;
        let emailVerificationFeatureNormalisedConfig =
            inputCreateAndSendCustomEmail !== undefined
                ? {
                      createAndSendCustomEmail: async (user: EmailPasswordUser, link: string, userContext: any) => {
                          let userInfo = await recipeInterfaceImpl.getUserById({
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

        this.emailPasswordBackwardCompatibilityService = new EmailPasswordBackwardCompatibilityService(
            emailPasswordRecipeInterfaceImpl,
            appInfo,
            isInServerlessEnv,
            resetPasswordUsingTokenFeature,
            emailVerificationFeatureNormalisedConfig
        );
    }

    sendEmail = async (input: TypeThirdPartyEmailPasswordEmailDeliveryInput & { userContext: any }) => {
        await this.emailPasswordBackwardCompatibilityService.sendEmail(input);
    };
}
