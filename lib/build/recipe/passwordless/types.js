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
exports.PasswordlessFlowType = void 0;
/**
 * The set of flow types supported by the passwordless recipe.
 *
 * Exported as a runtime constant so that consumers can reference the values
 * (e.g. `PasswordlessFlowType.USER_INPUT_CODE_AND_MAGIC_LINK`) instead of
 * duplicating the string literals.
 */
exports.PasswordlessFlowType = {
    USER_INPUT_CODE: "USER_INPUT_CODE",
    MAGIC_LINK: "MAGIC_LINK",
    USER_INPUT_CODE_AND_MAGIC_LINK: "USER_INPUT_CODE_AND_MAGIC_LINK",
};
