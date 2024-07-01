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

import { APIInterface, APIOptions } from "../../../types";
import STError from "../../../../../error";
import Passwordless from "../../../../passwordless";
import PasswordlessRecipe from "../../../../passwordless/recipe";
import { User } from "../../../../../types";
import RecipeUserId from "../../../../../recipeUserId";
import { parsePhoneNumber } from "libphonenumber-js/max";

type Response =
    | {
          status: string;
          createdNewRecipeUser: boolean;
          user: User;
          recipeUserId: RecipeUserId;
      }
    | {
          status: "FEATURE_NOT_ENABLED_ERROR";
      }
    | {
          status: "EMAIL_VALIDATION_ERROR";
          message: string;
      }
    | {
          status: "PHONE_VALIDATION_ERROR";
          message: string;
      };

export const createPasswordlessUser = async (
    _: APIInterface,
    tenantId: string,
    options: APIOptions,
    __: any
): Promise<Response> => {
    let passwordlessRecipe: PasswordlessRecipe | undefined = undefined;

    try {
        passwordlessRecipe = PasswordlessRecipe.getInstanceOrThrowError();
    } catch (_) {
        return {
            status: "FEATURE_NOT_ENABLED_ERROR",
        };
    }

    const requestBody = await options.req.getJSONBody();

    let email: string | undefined = requestBody.email;
    let phoneNumber: string | undefined = requestBody.phoneNumber;

    if ((email !== undefined && phoneNumber !== undefined) || (email === undefined && phoneNumber === undefined)) {
        throw new STError({
            type: STError.BAD_INPUT_ERROR,
            message: "Please provide exactly one of email or phoneNumber",
        });
    }

    if (
        email !== undefined &&
        (passwordlessRecipe.config.contactMethod === "EMAIL" ||
            passwordlessRecipe.config.contactMethod === "EMAIL_OR_PHONE")
    ) {
        email = email.trim();
        let validationError: string | undefined = undefined;

        validationError = await passwordlessRecipe.config.validateEmailAddress(email, tenantId);
        if (validationError !== undefined) {
            return {
                status: "EMAIL_VALIDATION_ERROR",
                message: validationError,
            };
        }
    }

    if (
        phoneNumber !== undefined &&
        (passwordlessRecipe.config.contactMethod === "PHONE" ||
            passwordlessRecipe.config.contactMethod === "EMAIL_OR_PHONE")
    ) {
        let validationError: string | undefined = undefined;

        validationError = await passwordlessRecipe.config.validatePhoneNumber(phoneNumber, tenantId);

        if (validationError !== undefined) {
            return {
                status: "PHONE_VALIDATION_ERROR",
                message: validationError,
            };
        }

        const parsedPhoneNumber = parsePhoneNumber(phoneNumber);
        if (parsedPhoneNumber === undefined) {
            // this can come here if the user has provided their own impl of validatePhoneNumber and
            // the phone number is valid according to their impl, but not according to the libphonenumber-js lib.
            phoneNumber = phoneNumber.trim();
        } else {
            phoneNumber = parsedPhoneNumber.format("E.164");
        }
    }

    return await Passwordless.signInUp(
        email !== undefined ? { email, tenantId } : { phoneNumber: phoneNumber!, tenantId }
    );
};
