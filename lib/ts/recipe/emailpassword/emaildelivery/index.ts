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

import { TypeEmailPasswordEmailDeliveryInput, User } from "../types";
import { User as EmailVerificationUser } from "../../emailverification/types";
import { createAndSendCustomEmail as defaultCreateAndSendCustomEmail } from "../passwordResetFunctions";
import { NormalisedAppinfo } from "../../../types";
import Recipe from "../recipe";
import { normaliseAndInvokeDefaultCreateAndSendCustomEmail as normaliseAndInvokeDefaultEmailVerificationCreateAndSendCustomEmail } from "../../emailverification/emaildelivery";

export async function getNormaliseAndInvokeDefaultCreateAndSendCustomEmail(
    recipeInstance: Recipe,
    appInfo: NormalisedAppinfo,
    input: TypeEmailPasswordEmailDeliveryInput,
    resetPasswordUsingTokenFeature?: {
        createAndSendCustomEmail?: (user: User, passwordResetURLWithToken: string, userContext: any) => Promise<void>;
    },
    emailVerificationFeature?: {
        createAndSendCustomEmail?: (
            user: User,
            emailVerificationURLWithToken: string,
            userContext: any
        ) => Promise<void>;
    }
) {
    if (input.type === "EMAIL_VERIFICATION") {
        const inputCreateAndSendCustomEmail = emailVerificationFeature?.createAndSendCustomEmail;
        let createAndSendCustomEmail:
            | ((user: EmailVerificationUser, emailVerificationURLWithToken: string, userContext: any) => Promise<void>)
            | undefined = undefined;
        if (inputCreateAndSendCustomEmail !== undefined) {
            createAndSendCustomEmail = async (user: EmailVerificationUser, link: string, userContext: any) => {
                let userInfo = await recipeInstance.recipeInterfaceImpl.getUserById({
                    userId: user.id,
                    userContext,
                });
                if (userInfo === undefined) {
                    throw new Error("Unknown User ID provided");
                }
                return await inputCreateAndSendCustomEmail(userInfo, link, userContext);
            };
        }
        return await normaliseAndInvokeDefaultCreateAndSendCustomEmail(
            appInfo,
            input,
            recipeInstance.isInServerlessEnv,
            resetPasswordUsingTokenFeature,
            {
                createAndSendCustomEmail,
            }
        );
    }
    return await normaliseAndInvokeDefaultCreateAndSendCustomEmail(
        appInfo,
        input,
        recipeInstance.isInServerlessEnv,
        resetPasswordUsingTokenFeature,
        undefined
    );
}

export async function normaliseAndInvokeDefaultCreateAndSendCustomEmail(
    appInfo: NormalisedAppinfo,
    input: TypeEmailPasswordEmailDeliveryInput,
    isInServerlessEnv: boolean,
    resetPasswordUsingTokenFeature?: {
        createAndSendCustomEmail?: (user: User, passwordResetURLWithToken: string, userContext: any) => Promise<void>;
    },
    emailVerificationFeature?: {
        createAndSendCustomEmail?: (
            user: EmailVerificationUser,
            emailVerificationURLWithToken: string,
            userContext: any
        ) => Promise<void>;
    }
) {
    if (input.type === "EMAIL_VERIFICATION") {
        await normaliseAndInvokeDefaultEmailVerificationCreateAndSendCustomEmail(
            appInfo,
            input,
            isInServerlessEnv,
            emailVerificationFeature?.createAndSendCustomEmail
        );
    } else {
        let createAndSendCustomEmail = resetPasswordUsingTokenFeature?.createAndSendCustomEmail;
        if (createAndSendCustomEmail === undefined) {
            createAndSendCustomEmail = defaultCreateAndSendCustomEmail(appInfo);
        }
        try {
            if (!isInServerlessEnv) {
                createAndSendCustomEmail(input.user, input.passwordResetLink, input.userContext).catch((_) => {});
            } else {
                // see https://github.com/supertokens/supertokens-node/pull/135
                await createAndSendCustomEmail(input.user, input.passwordResetLink, input.userContext);
            }
        } catch (_) {}
    }
}
