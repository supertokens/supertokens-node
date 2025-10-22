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
exports.transformErrorToSuperTokensError = exports.SuperTokensPluginError = void 0;
const logger_1 = require("./logger");
class SuperTokensError extends Error {
    constructor(options) {
        super(options.message);
        this.type = options.type;
        this.payload = options.payload;
        this.errMagic = SuperTokensError.errMagic;
    }
    static isErrorFromSuperTokens(obj) {
        return obj.errMagic === SuperTokensError.errMagic;
    }
}
SuperTokensError.errMagic = "ndskajfasndlfkj435234krjdsa";
SuperTokensError.BAD_INPUT_ERROR = "BAD_INPUT_ERROR";
SuperTokensError.UNKNOWN_ERROR = "UNKNOWN_ERROR";
SuperTokensError.PLUGIN_ERROR = "PLUGIN_ERROR";
exports.default = SuperTokensError;
class SuperTokensPluginError extends SuperTokensError {
    constructor(options) {
        super(Object.assign(Object.assign({}, options), { type: SuperTokensError.PLUGIN_ERROR }));
        this.code = options.code || 400;
    }
}
exports.SuperTokensPluginError = SuperTokensPluginError;
const transformErrorToSuperTokensError = (err) => {
    // passthrough for errors from SuperTokens - let errorHandler handle them
    if (SuperTokensError.isErrorFromSuperTokens(err)) {
        return err;
    }
    (0, logger_1.logDebugMessage)(
        `transformErrorToSuperTokensError: Transforming error to SuperTokensError. Error: ${
            err === null || err === void 0 ? void 0 : err.message
        }.\nStack:\n${err === null || err === void 0 ? void 0 : err.stack}`
    );
    // mask the original stack trace by not copying it on the new error
    return new SuperTokensError({ message: "Unknown error", type: SuperTokensError.UNKNOWN_ERROR });
};
exports.transformErrorToSuperTokensError = transformErrorToSuperTokensError;
