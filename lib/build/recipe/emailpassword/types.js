"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
const TypeString = {
    type: "string",
};
const TypeBoolean = {
    type: "boolean",
};
const TypeAny = {
    type: "any",
};
const InputSessionFeatureSchema = {
    type: "object",
    properties: {
        setJwtPayload: TypeAny,
        setSessionData: TypeAny,
    },
    additionalProperties: false,
};
const InputEmailVerificationFeatureSchema = {
    type: "object",
    properties: {
        getEmailVerificationURL: TypeAny,
        createAndSendCustomEmail: TypeAny,
    },
    additionalProperties: false,
};
const InputSignUpSchema = {
    type: "object",
    properties: {
        formFields: {
            type: "array",
            items: {
                type: "object",
                properties: {
                    id: TypeString,
                    validate: TypeAny,
                    optional: TypeBoolean,
                },
                required: ["id"],
                additionalProperties: false,
            },
        },
    },
    additionalProperties: false,
};
exports.InputResetPasswordUsingTokenFeatureSchema = {
    type: "object",
    properties: {
        getResetPasswordURL: TypeAny,
        createAndSendCustomEmail: TypeAny,
    },
    additionalProperties: false,
};
exports.InputSchema = {
    type: "object",
    properties: {
        sessionFeature: InputSessionFeatureSchema,
        signUpFeature: InputSignUpSchema,
        resetPasswordUsingTokenFeature: exports.InputResetPasswordUsingTokenFeatureSchema,
        emailVerificationFeature: InputEmailVerificationFeatureSchema,
        override: TypeAny,
    },
    additionalProperties: false,
};
