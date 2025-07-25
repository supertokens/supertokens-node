"use strict";
var __importDefault =
    (this && this.__importDefault) ||
    function (mod) {
        return mod && mod.__esModule ? mod : { default: mod };
    };
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateWebauthnGeneratedOptionsIdOrThrowError = validateWebauthnGeneratedOptionsIdOrThrowError;
exports.validateCredentialOrThrowError = validateCredentialOrThrowError;
/* Copyright (c) 2025, VRAI Labs and/or its affiliates. All rights reserved.
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
const error_1 = __importDefault(require("../error"));
function validateWebauthnGeneratedOptionsIdOrThrowError(webauthnGeneratedOptionsId) {
    if (webauthnGeneratedOptionsId === undefined) {
        throw newBadRequestError("webauthnGeneratedOptionsId is required");
    }
    return webauthnGeneratedOptionsId;
}
function validateCredentialOrThrowError(credential) {
    if (credential === undefined) {
        throw newBadRequestError("credential is required");
    }
    return credential;
}
function newBadRequestError(message) {
    return new error_1.default({
        type: error_1.default.BAD_INPUT_ERROR,
        message,
    });
}
