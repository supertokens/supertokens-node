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
import { TypeThirdPartyEmailDeliveryInput, User, RecipeInterface } from "../../../types";
import { User as EmailVerificationUser } from "../../../../emailverification/types";
import { NormalisedAppinfo } from "../../../../../types";
import EmailVerificationBackwardCompatibilityService from "../../../../emailverification/emaildelivery/services/backwardCompatibility";
import { EmailDeliveryInterface } from "../../../../../ingredients/emaildelivery/types";

export default class BackwardCompatibilityService implements EmailDeliveryInterface<TypeThirdPartyEmailDeliveryInput> {
    private emailVerificationBackwardCompatibilityService: EmailVerificationBackwardCompatibilityService;

    constructor(
        recipeInterfaceImpl: RecipeInterface,
        appInfo: NormalisedAppinfo,
        isInServerlessEnv: boolean,
        emailVerificationFeature?: {
            createAndSendCustomEmail?: (
                user: User,
                emailVerificationURLWithToken: string,
                userContext: any
            ) => Promise<void>;
        }
    ) {
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
            this.emailVerificationBackwardCompatibilityService = new EmailVerificationBackwardCompatibilityService(
                appInfo,
                isInServerlessEnv,
                emailVerificationFeatureNormalisedConfig.createAndSendCustomEmail
            );
        }
    }

    sendEmail = async (input: TypeThirdPartyEmailDeliveryInput & { userContext: any }) => {
        await this.emailVerificationBackwardCompatibilityService.sendEmail(input);
    };
}
