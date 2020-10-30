"use strict";
/* Copyright (c) 2020, VRAI Labs and/or its affiliates. All rights reserved.
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
const error_1 = require("../../error");
class SessionError extends error_1.default {
    constructor(options, recipeId) {
        super(Object.assign(Object.assign({}, options), { rId: recipeId }));
    }
}
exports.default = SessionError;
SessionError.EMAIL_ALREADY_EXISTS_ERROR = "EMAIL_ALREADY_EXISTS_ERROR";
SessionError.FIELD_ERROR = "FIELD_ERROR";
//# sourceMappingURL=error.js.map