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

import Recipe from "./recipe";
import {
    TypeInput,
    TypeInputGetOrigin,
    TypeInputRelyingPartyId,
    TypeInputRelyingPartyName,
    TypeInputValidateEmailAddress,
    TypeNormalisedInput,
    TypeNormalisedInputGetOrigin,
    TypeNormalisedInputRelyingPartyId,
    TypeNormalisedInputRelyingPartyName,
    TypeNormalisedInputValidateEmailAddress,
} from "./types";
import { NormalisedAppinfo, UserContext } from "../../types";
import { RecipeInterface, APIInterface } from "./types";
import { BaseRequest } from "../../framework";
import BackwardCompatibilityService from "./emaildelivery/services/backwardCompatibility";

export function validateAndNormaliseUserInput(
    _: Recipe,
    appInfo: NormalisedAppinfo,
    config?: TypeInput
): TypeNormalisedInput {
    let getRelyingPartyId = validateAndNormaliseRelyingPartyIdConfig(appInfo, config?.getRelyingPartyId);
    let getRelyingPartyName = validateAndNormaliseRelyingPartyNameConfig(appInfo, config?.getRelyingPartyName);
    let getOrigin = validateAndNormaliseGetOriginConfig(appInfo, config?.getOrigin);
    let validateEmailAddress = validateAndNormaliseValidateEmailAddressConfig(config?.validateEmailAddress);

    let override = {
        functions: (originalImplementation: RecipeInterface) => originalImplementation,
        apis: (originalImplementation: APIInterface) => originalImplementation,
        ...config?.override,
    };

    function getEmailDeliveryConfig(isInServerlessEnv: boolean) {
        let emailService = config?.emailDelivery?.service;
        /**
         * If the user has not passed even that config, we use the default
         * createAndSendCustomEmail implementation which calls our supertokens API
         */
        if (emailService === undefined) {
            emailService = new BackwardCompatibilityService(appInfo, isInServerlessEnv);
        }

        return {
            ...config?.emailDelivery,
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
        };
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

function validateAndNormaliseRelyingPartyIdConfig(
    normalisedAppinfo: NormalisedAppinfo,
    relyingPartyIdConfig: TypeInputRelyingPartyId | undefined
): TypeNormalisedInputRelyingPartyId {
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

function validateAndNormaliseRelyingPartyNameConfig(
    normalisedAppInfo: NormalisedAppinfo,
    relyingPartyNameConfig: TypeInputRelyingPartyName | undefined
): TypeNormalisedInputRelyingPartyName {
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

function validateAndNormaliseGetOriginConfig(
    normalisedAppinfo: NormalisedAppinfo,
    getOriginConfig: TypeInputGetOrigin | undefined
): TypeNormalisedInputGetOrigin {
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

function validateAndNormaliseValidateEmailAddressConfig(
    validateEmailAddressConfig: TypeInputValidateEmailAddress | undefined
): TypeNormalisedInputValidateEmailAddress {
    return (email, tenantId) => {
        if (typeof validateEmailAddressConfig === "function") {
            return validateEmailAddressConfig(email, tenantId);
        } else {
            return defaultEmailValidator(email);
        }
    };
}

export async function defaultEmailValidator(value: any) {
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

export function getRecoverAccountLink(input: {
    appInfo: NormalisedAppinfo;
    token: string;
    tenantId: string;
    request: BaseRequest | undefined;
    userContext: UserContext;
}): string {
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
