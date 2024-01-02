/* Copyright (c) 2024, VRAI Labs and/or its affiliates. All rights reserved.
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

import { APIInterface } from "../";
import { MultiFactorAuthClaim } from "../multiFactorAuthClaim";
import { getUser } from "../../..";
import SessionError from "../../session/error";

export default function getAPIInterface(): APIInterface {
    return {
        resyncSessionAndFetchMFAInfoPUT: async ({ options, session, userContext }) => {
            const userId = session.getUserId();
            const user = await getUser(userId, userContext);

            if (user === undefined) {
                throw new SessionError({
                    type: SessionError.UNAUTHORISED,
                    message: "Session user not found",
                });
            }
            const isAlreadySetup = await options.recipeImplementation.getFactorsSetupForUser({
                user,
                userContext,
            });

            await session.fetchAndSetClaim(MultiFactorAuthClaim, userContext);

            return {
                status: "OK",
                factorsThatAreAlreadySetup: isAlreadySetup,
                emails: options.recipeInstance.getEmailsForFactors(user, session.getRecipeUserId()),
                phoneNumbers: options.recipeInstance.getPhoneNumbersForFactors(user, session.getRecipeUserId()),
            };
        },
    };
}
