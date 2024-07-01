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
import EmailPassword from "../../../../emailpassword";
import EmailPasswordRecipe from "../../../../emailpassword/recipe";
import { User } from "../../../../../types";
import RecipeUserId from "../../../../../recipeUserId";

type Response =
    | {
          status: "OK";
          user: User;
          recipeUserId: RecipeUserId;
      }
    | {
          status: "EMAIL_ALREADY_EXISTS_ERROR" | "FEATURE_NOT_ENABLED_ERROR";
      }
    | {
          status: "EMAIL_VALIDATION_ERROR";
          message: string;
      }
    | {
          status: "PASSWORD_VALIDATION_ERROR";
          message: string;
      };

export const createEmailPasswordUser = async (
    _: APIInterface,
    tenantId: string,
    options: APIOptions,
    userContext: any
): Promise<Response> => {
    let emailPassword: EmailPasswordRecipe | undefined = undefined;
    try {
        emailPassword = EmailPasswordRecipe.getInstanceOrThrowError();
    } catch (error) {
        return {
            status: "FEATURE_NOT_ENABLED_ERROR",
        };
    }

    const requestBody = await options.req.getJSONBody();

    const email = requestBody.email;
    const password = requestBody.password;

    if (email === undefined || typeof email !== "string") {
        throw new STError({
            message: "Required parameter 'email' is missing or has an invalid type",
            type: STError.BAD_INPUT_ERROR,
        });
    }

    if (password === undefined || typeof password !== "string") {
        throw new STError({
            message: "Required parameter 'password' is missing or has an invalid type",
            type: STError.BAD_INPUT_ERROR,
        });
    }

    const emailFormField = emailPassword.config.signUpFeature.formFields.find((field) => field.id === "email")!; // using non-null assertion as the field with id email will always exists in formFields array.

    const validateEmailError = await emailFormField.validate(email, tenantId, userContext);

    if (validateEmailError !== undefined) {
        return {
            status: "EMAIL_VALIDATION_ERROR",
            message: validateEmailError,
        };
    }

    const passwordFormField = emailPassword.config.signUpFeature.formFields.find((field) => field.id === "password")!; // using non-null assertion as the field with id password will always exists in formFields array.

    const validatePasswordError = await passwordFormField.validate(password, tenantId, userContext);

    if (validatePasswordError !== undefined) {
        return {
            status: "PASSWORD_VALIDATION_ERROR",
            message: validatePasswordError,
        };
    }

    const response = await EmailPassword.signUp(tenantId, email, password);
    // For some reason TS complains if I check the other status codes then throw...
    if (response.status === "OK" || response.status === "EMAIL_ALREADY_EXISTS_ERROR") {
        return response;
    } else {
        throw new Error(
            "This should never happen: EmailPassword.signUp threw a session user related error without passing a session"
        );
    }
};
