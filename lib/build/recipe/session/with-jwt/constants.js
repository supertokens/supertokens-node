"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
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
/*
    This key is used to determine the property name used when adding the jwt to the access token payload
    For example if the Session recipe is initialised with config
    {
        ...
        jwt: {
            enable: true,
            propertyNameInAccessTokenPayload: "jwtKey",
        },
        ...
    }

    The access token payload after creating a session would look like
    {
        ...
        jwtKey: "JWT_STRING",
        _jwtPName: "jwtKey",
    }

    When trying to refresh the session or updating the access token payload, this key is used to determine and retrieve
    the exsiting JWT from the access token payload.
*/
exports.ACCESS_TOKEN_PAYLOAD_JWT_PROPERTY_NAME_KEY = "_jwtPName";
exports.JWT_RESERVED_KEY_USE_ERROR_MESSAGE = `${exports.ACCESS_TOKEN_PAYLOAD_JWT_PROPERTY_NAME_KEY} is a reserved property name, please use a different key name for the jwt`;
