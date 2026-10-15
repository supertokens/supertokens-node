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
exports.getNormalisedOriginTuple = exports.isFakeEmail = exports.validateAndNormaliseUserInput = void 0;
function validateAndNormaliseUserInput(appInfo, config) {
    let signInAndUpFeature = validateAndNormaliseSignInAndUpConfig(
        appInfo,
        config === null || config === void 0 ? void 0 : config.signInAndUpFeature
    );
    let override = Object.assign(
        {
            functions: (originalImplementation) => originalImplementation,
            apis: (originalImplementation) => originalImplementation,
        },
        config === null || config === void 0 ? void 0 : config.override
    );
    return {
        signInAndUpFeature,
        isValidFrontendRedirectURI: config === null || config === void 0 ? void 0 : config.isValidFrontendRedirectURI,
        override,
    };
}
exports.validateAndNormaliseUserInput = validateAndNormaliseUserInput;
function validateAndNormaliseSignInAndUpConfig(_, config) {
    if (config === undefined || config.providers === undefined) {
        return {
            providers: [],
        };
    }
    const thirdPartyIdSet = new Set();
    for (const provider of config.providers) {
        if (thirdPartyIdSet.has(provider.config.thirdPartyId)) {
            throw new Error(`The providers array has multiple entries for the same third party provider.`);
        }
        thirdPartyIdSet.add(provider.config.thirdPartyId);
    }
    return {
        providers: config.providers,
    };
}
function isFakeEmail(email) {
    return email.endsWith("@stfakeemail.supertokens.com") || email.endsWith(".fakeemail.com"); // .fakeemail.com for older users
}
exports.isFakeEmail = isFakeEmail;
/**
 * Returns the (protocol, lowercased hostname, port) tuple of an absolute http(s) URL, filling in the
 * default port if it is not explicit. Returns undefined if the input is not such a URL.
 */
function getNormalisedOriginTuple(url) {
    let urlObj;
    try {
        urlObj = new URL(url);
    } catch (_a) {
        return undefined;
    }
    if ((urlObj.protocol !== "http:" && urlObj.protocol !== "https:") || urlObj.hostname === "") {
        return undefined;
    }
    return {
        protocol: urlObj.protocol,
        hostname: urlObj.hostname.toLowerCase(),
        port: urlObj.port !== "" ? urlObj.port : urlObj.protocol === "https:" ? "443" : "80",
    };
}
exports.getNormalisedOriginTuple = getNormalisedOriginTuple;
