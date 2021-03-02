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
class SuperTokensError {
    constructor(options) {
        this.errMagic = SuperTokensError.errMagic;
        this.getRecipeId = () => {
            return this.recipe === undefined ? "" : this.recipe.getRecipeId();
        };
        this.type = options.type;
        this.message = options.type === "GENERAL_ERROR" ? options.payload.message : options.message;
        this.payload = options.payload;
        this.recipe = options.recipe;
    }
    static isErrorFromSuperTokens(obj) {
        return obj.errMagic === SuperTokensError.errMagic;
    }
}
exports.default = SuperTokensError;
SuperTokensError.errMagic = "ndskajfasndlfkj435234krjdsa";
SuperTokensError.GENERAL_ERROR = "GENERAL_ERROR";
SuperTokensError.BAD_INPUT_ERROR = "BAD_INPUT_ERROR";
//# sourceMappingURL=error.js.map
