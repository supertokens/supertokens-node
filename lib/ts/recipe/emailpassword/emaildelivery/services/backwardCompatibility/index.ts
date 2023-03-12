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
import { TypeEmailPasswordEmailDeliveryInput, RecipeInterface } from "../../../types";
import { createAndSendCustomEmail as defaultCreateAndSendCustomEmail } from "../../../passwordResetFunctions";
import { NormalisedAppinfo, User } from "../../../../../types";
import { EmailDeliveryInterface } from "../../../../../ingredients/emaildelivery/types";
import { getUser } from "../../../../..";

export default class BackwardCompatibilityService
    implements EmailDeliveryInterface<TypeEmailPasswordEmailDeliveryInput> {
    private recipeInterfaceImpl: RecipeInterface;
    private isInServerlessEnv: boolean;
    private appInfo: NormalisedAppinfo;
    private resetPasswordUsingTokenFeature: {
        createAndSendCustomEmail: (
            user: {
                id: string;
                recipeUserId: string;
                email: string;
                timeJoined: number;
            },
            passwordResetURLWithToken: string,
            userContext: any
        ) => Promise<void>;
    };

    constructor(recipeInterfaceImpl: RecipeInterface, appInfo: NormalisedAppinfo, isInServerlessEnv: boolean) {
        this.recipeInterfaceImpl = recipeInterfaceImpl;
        this.isInServerlessEnv = isInServerlessEnv;
        this.appInfo = appInfo;
        {
            this.resetPasswordUsingTokenFeature = {
                createAndSendCustomEmail: defaultCreateAndSendCustomEmail(this.appInfo),
            };
        }
    }

    sendEmail = async (input: TypeEmailPasswordEmailDeliveryInput & { userContext: any }) => {
        let user: User | undefined =
            input.user.recipeUserId !== undefined
                ? await this.recipeInterfaceImpl.getUserById({
                      userId: input.user.recipeUserId,
                      userContext: input.userContext,
                  })
                : undefined;
        if (input.user.recipeUserId === undefined) {
            user = await getUser(input.user.id);
        }
        if (user === undefined) {
            throw Error("this should never come here");
        }
        let recipeLoginMethod = user.loginMethods.find(
            (u) => u.recipeId === "emailpassword" && u.email === input.user.email
        );
        if (recipeLoginMethod === undefined) {
            throw Error("this should never come here");
        }
        // we add this here cause the user may have overridden the sendEmail function
        // to change the input email and if we don't do this, the input email
        // will get reset by the getUserById call above.
        let passwordResetEmailUser: {
            id: string;
            recipeUserId: string;
            email: string;
            timeJoined: number;
        } = {
            id: input.user.id,
            recipeUserId: recipeLoginMethod.recipeUserId,
            email: input.user.email,
            timeJoined: recipeLoginMethod.timeJoined,
        };
        try {
            if (!this.isInServerlessEnv) {
                this.resetPasswordUsingTokenFeature
                    .createAndSendCustomEmail(passwordResetEmailUser, input.passwordResetLink, input.userContext)
                    .catch((_) => {});
            } else {
                // see https://github.com/supertokens/supertokens-node/pull/135
                await this.resetPasswordUsingTokenFeature.createAndSendCustomEmail(
                    passwordResetEmailUser,
                    input.passwordResetLink,
                    input.userContext
                );
            }
        } catch (_) {}
    };
}
