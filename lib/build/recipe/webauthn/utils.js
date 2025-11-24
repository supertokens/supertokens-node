"use strict";
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
var __importDefault =
    (this && this.__importDefault) ||
    function (mod) {
        return mod && mod.__esModule ? mod : { default: mod };
    };
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateAndNormaliseUserInput = validateAndNormaliseUserInput;
exports.defaultEmailValidator = defaultEmailValidator;
exports.getRecoverAccountLink = getRecoverAccountLink;
const backwardCompatibility_1 = __importDefault(require("./emaildelivery/services/backwardCompatibility"));
function validateAndNormaliseUserInput(_, appInfo, config) {
    let getRelyingPartyId = validateAndNormaliseRelyingPartyIdConfig(
        appInfo,
        config === null || config === void 0 ? void 0 : config.getRelyingPartyId
    );
    let getRelyingPartyName = validateAndNormaliseRelyingPartyNameConfig(
        appInfo,
        config === null || config === void 0 ? void 0 : config.getRelyingPartyName
    );
    let getOrigin = validateAndNormaliseGetOriginConfig(
        appInfo,
        config === null || config === void 0 ? void 0 : config.getOrigin
    );
    let validateEmailAddress = validateAndNormaliseValidateEmailAddressConfig(
        config === null || config === void 0 ? void 0 : config.validateEmailAddress
    );
    let override = Object.assign(
        {
            functions: (originalImplementation) => originalImplementation,
            apis: (originalImplementation) => originalImplementation,
        },
        config === null || config === void 0 ? void 0 : config.override
    );
    function getEmailDeliveryConfig(isInServerlessEnv) {
        var _a;
        let emailService =
            (_a = config === null || config === void 0 ? void 0 : config.emailDelivery) === null || _a === void 0
                ? void 0
                : _a.service;
        /**
         * If the user has not passed even that config, we use the default
         * createAndSendCustomEmail implementation which calls our supertokens API
         */
        if (emailService === undefined) {
            emailService = new backwardCompatibility_1.default(appInfo, isInServerlessEnv);
        }
        return Object.assign(Object.assign({}, config === null || config === void 0 ? void 0 : config.emailDelivery), {
            /**
             * if we do
             * let emailDelivery = {
             *    service: emailService,
             *    ...config.emailDelivery,
             * };
             *
             * and if the user has passed service as undefined,
             * it it again get set to undefined, so we
             * set service at the end
             */
            service: emailService,
        });
    }
    return {
        override,
        getOrigin,
        getRelyingPartyId,
        getRelyingPartyName,
        validateEmailAddress,
        getEmailDeliveryConfig,
    };
}
function validateAndNormaliseRelyingPartyIdConfig(normalisedAppinfo, relyingPartyIdConfig) {
    return (props) => {
        if (typeof relyingPartyIdConfig === "string") {
            return Promise.resolve(relyingPartyIdConfig);
        } else if (typeof relyingPartyIdConfig === "function") {
            return relyingPartyIdConfig(props);
        } else {
            const urlString = normalisedAppinfo.apiDomain.getAsStringDangerous();
            const url = new URL(urlString);
            const hostname = url.hostname;
            return Promise.resolve(hostname);
        }
    };
}
function validateAndNormaliseRelyingPartyNameConfig(normalisedAppInfo, relyingPartyNameConfig) {
    return (props) => {
        if (typeof relyingPartyNameConfig === "string") {
            return Promise.resolve(relyingPartyNameConfig);
        } else if (typeof relyingPartyNameConfig === "function") {
            return relyingPartyNameConfig(props);
        } else {
            return Promise.resolve(normalisedAppInfo.appName);
        }
    };
}
function validateAndNormaliseGetOriginConfig(normalisedAppinfo, getOriginConfig) {
    return (props) => {
        if (typeof getOriginConfig === "function") {
            return getOriginConfig(props);
        } else {
            return Promise.resolve(
                normalisedAppinfo
                    .getOrigin({ request: props.request, userContext: props.userContext })
                    .getAsStringDangerous()
            );
        }
    };
}
function validateAndNormaliseValidateEmailAddressConfig(validateEmailAddressConfig) {
    return (email, tenantId, userContext) => {
        if (typeof validateEmailAddressConfig === "function") {
            return validateEmailAddressConfig(email, tenantId, userContext);
        } else {
            return defaultEmailValidator(email);
        }
    };
}
async function defaultEmailValidator(value) {
    if (typeof value !== "string") {
        return "Development bug: Please make sure the email field yields a string";
    }
    if (
        value.match(
            /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
        ) === null
    ) {
        return "Email is invalid";
    }
    return undefined;
}
function getRecoverAccountLink(input) {
    return (
        input.appInfo
            .getOrigin({
                request: input.request,
                userContext: input.userContext,
            })
            .getAsStringDangerous() +
        input.appInfo.websiteBasePath.getAsStringDangerous() +
        "/webauthn/recover?token=" +
        input.token +
        "&tenantId=" +
        input.tenantId
    );
}
