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

import { isAnIpAddress } from "./utils";

export default class NormalisedURLDomain {
    private value: string;

    constructor(url: string) {
        this.value = normaliseURLDomainOrThrowError(url);
    }

    getAsStringDangerous = () => {
        return this.value;
    };
}

function normaliseURLDomainOrThrowError(input: string, ignoreProtocol = false): string {
    input = input.trim().toLowerCase();

    // if the input starts with a . (eg: .domain.tld)
    if (input.indexOf(".") === 0) {
        input = input.substring(1);
    }

    // if the input dosen't start with a protocol add a default one;
    if (input.match(/^[^:]:\/\//)) {
        if (input.startsWith("localhost") || isAnIpAddress(input)) {
            input = "http://" + input;
        } else {
            input = "https://" + input;
        }
    }

    try {
        const urlObj = new URL(input);

        if (ignoreProtocol) {
            if (urlObj.hostname.startsWith("localhost") || isAnIpAddress(urlObj.hostname)) {
                return "http://" + urlObj.host;
            } else {
                return "https://" + urlObj.host;
            }
        } else {
            return urlObj.protocol + "//" + urlObj.host;
        }
    } catch {
        throw Error("Please provide a valid domain name");
    }
}
