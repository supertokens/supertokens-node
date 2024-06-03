/* Copyright (c) 2023, VRAI Labs and/or its affiliates. All rights reserved.
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

import type { NormalisedAppinfo } from "../../types";
import type { TypeInput, RecipeInterface, TypeNormalisedInput } from "./types";

async function defaultOnAccountLinked() {}

async function defaultShouldDoAutomaticAccountLinking(): Promise<{
    shouldAutomaticallyLink: false;
}> {
    return {
        shouldAutomaticallyLink: false,
    };
}

export function recipeInitDefinedShouldDoAutomaticAccountLinking(config: TypeNormalisedInput) {
    return config.shouldDoAutomaticAccountLinking !== defaultShouldDoAutomaticAccountLinking;
}

export function validateAndNormaliseUserInput(_: NormalisedAppinfo, config?: TypeInput): TypeNormalisedInput {
    let onAccountLinked = config?.onAccountLinked || defaultOnAccountLinked;
    let shouldDoAutomaticAccountLinking =
        config?.shouldDoAutomaticAccountLinking || defaultShouldDoAutomaticAccountLinking;

    let override = {
        functions: (originalImplementation: RecipeInterface) => originalImplementation,
        ...config?.override,
    };

    return {
        override,
        onAccountLinked,
        shouldDoAutomaticAccountLinking,
    };
}
