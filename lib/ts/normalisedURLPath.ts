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

import { URL } from "url";
import STError from "./error";

export default class NormalisedURLPath {
    private value: string;

    constructor(rId: string, url: string) {
        this.value = normaliseURLPathOrThrowError(rId, url);
    }

    startsWith = (other: NormalisedURLPath) => {
        return this.value.startsWith(other.value);
    };

    appendPath = (rId: string, other: NormalisedURLPath) => {
        return new NormalisedURLPath(rId, this.value + other.value);
    };

    getAsStringDangerous = () => {
        return this.value;
    };

    equals = (other: NormalisedURLPath) => {
        return this.value === other.value;
    };

    isARecipePath = () => {
        return this.value === "/recipe" || this.value.startsWith("/recipe/");
    };
}

export function normaliseURLPathOrThrowError(rId: string, input: string): string {
    input = input.trim().toLowerCase();

    try {
        if (!input.startsWith("http://") && !input.startsWith("https://")) {
            throw new Error("converting to proper URL");
        }
        let urlObj = new URL(input);
        input = urlObj.pathname;

        if (input.charAt(input.length - 1) === "/") {
            return input.substr(0, input.length - 1);
        }

        return input;
    } catch (err) {}
    // not a valid URL

    // If the input contains a . it means they have given a domain name.
    // So we try assuming that they have given a domain name + path
    if (
        (input.indexOf(".") !== -1 || input.startsWith("localhost")) &&
        !input.startsWith("http://") &&
        !input.startsWith("https://")
    ) {
        input = "http://" + input;
        return normaliseURLPathOrThrowError(rId, input);
    }

    if (input.charAt(0) !== "/") {
        input = "/" + input;
    }

    // at this point, we should be able to convert it into a fake URL and recursively call this function.
    try {
        // test that we can convert this to prevent an infinite loop
        new URL("http://example.com" + input);

        return normaliseURLPathOrThrowError(rId, "http://example.com" + input);
    } catch (err) {
        throw new STError({
            type: STError.GENERAL_ERROR,
            rId,
            payload: new Error("Please provide a valid URL path"),
        });
    }
}
