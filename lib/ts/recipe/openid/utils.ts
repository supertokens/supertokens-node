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
import NormalisedURLDomain from "../../normalisedURLDomain";
import NormalisedURLPath from "../../normalisedURLPath";
import { NormalisedAppinfo } from "../../types";
import { APIInterface, RecipeInterface, TypeInput, TypeNormalisedInput } from "./types";
import { BaseRequest } from "../../framework";

export function validateAndNormaliseUserInput(appInfo: NormalisedAppinfo, config?: TypeInput): TypeNormalisedInput {
    let issuerDomain = async (req: BaseRequest, userContext: any) => {
        let issuerDomainVal = await appInfo.apiDomain(req, userContext);
        if (config !== undefined) {
            if (config.issuer !== undefined) {
                issuerDomainVal = new NormalisedURLDomain(config.issuer);
            }
        }
        return issuerDomainVal;
    };
    let issuerPath = appInfo.apiBasePath;

    if (config !== undefined) {
        if (config.issuer !== undefined) {
            issuerPath = new NormalisedURLPath(config.issuer);
        }

        if (!issuerPath.equals(appInfo.apiBasePath)) {
            throw new Error("The path of the issuer URL must be equal to the apiBasePath. The default value is /auth");
        }
    }

    let override = {
        functions: (originalImplementation: RecipeInterface) => originalImplementation,
        apis: (originalImplementation: APIInterface) => originalImplementation,
        ...config?.override,
    };

    return {
        issuerDomain,
        issuerPath,
        jwtValiditySeconds: config?.jwtValiditySeconds,
        override,
    };
}
