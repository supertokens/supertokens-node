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

import { send200Response } from "../../../utils";
import STError from "../error";
import { APIInterface, APIOptions } from "..";
import parsePhoneNumber from "libphonenumber-js/max";

export default async function createCode(apiImplementation: APIInterface, options: APIOptions): Promise<boolean> {
    if (apiImplementation.createCodePOST === undefined) {
        return false;
    }

    const body = await options.req.getJSONBody();
    let email: string | undefined = body.email;
    let phoneNumber: string | undefined = body.phoneNumber;

    if ((email !== undefined && phoneNumber !== undefined) || (email === undefined && phoneNumber === undefined)) {
        throw new STError({
            type: STError.BAD_INPUT_ERROR,
            message: "Please provide exactly one of email or phoneNumber",
        });
    }

    if (email === undefined && options.config.contactMethod === "EMAIL") {
        throw new STError({
            type: STError.BAD_INPUT_ERROR,
            message: 'Please provide an email since you have set the contactMethod to "EMAIL"',
        });
    }

    if (phoneNumber === undefined && options.config.contactMethod === "PHONE") {
        throw new STError({
            type: STError.BAD_INPUT_ERROR,
            message: 'Please provide a phoneNumber since you have set the contactMethod to "PHONE"',
        });
    }

    // normalise and validate format of input
    if (
        email !== undefined &&
        (options.config.contactMethod === "EMAIL" || options.config.contactMethod === "EMAIL_OR_PHONE")
    ) {
        email = email.trim();
        const validateError = await options.config.validateEmailAddress(email);
        if (validateError !== undefined) {
            send200Response(options.res, {
                status: "GENERAL_ERROR",
                message: validateError,
            });
            return true;
        }
    }

    if (
        phoneNumber !== undefined &&
        (options.config.contactMethod === "PHONE" || options.config.contactMethod === "EMAIL_OR_PHONE")
    ) {
        const validateError = await options.config.validatePhoneNumber(phoneNumber);
        if (validateError !== undefined) {
            send200Response(options.res, {
                status: "GENERAL_ERROR",
                message: validateError,
            });
            return true;
        }
        const parsedPhoneNumber = parsePhoneNumber(phoneNumber);
        if (parsedPhoneNumber === undefined) {
            // this can come here if the user has provided their own impl of validatePhoneNumber and
            // the phone number is valid according to their impl, but not according to the libphonenumber-js lib.
            phoneNumber = phoneNumber.trim();
        } else {
            phoneNumber = parsedPhoneNumber.formatInternational();
        }
    }

    let result = await apiImplementation.createCodePOST(
        email !== undefined
            ? { email, options, userContext: {} }
            : { phoneNumber: phoneNumber!, options, userContext: {} }
    );

    send200Response(options.res, result);
    return true;
}
