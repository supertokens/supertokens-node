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

import { getBackwardsCompatibleUserInfo, send200Response } from "../../../utils";
import { validateFormFieldsOrThrowError } from "./utils";
import { APIInterface, APIOptions } from "../";
import { UserContext } from "../../../types";
import Session from "../../session";

export default async function signInAPI(
    apiImplementation: APIInterface,
    tenantId: string,
    options: APIOptions,
    userContext: UserContext
): Promise<boolean> {
    // Logic as per https://github.com/supertokens/supertokens-node/issues/20#issuecomment-710346362
    if (apiImplementation.signInPOST === undefined) {
        return false;
    }

    // step 1
    let formFields: {
        id: string;
        value: string;
    }[] = await validateFormFieldsOrThrowError(
        options.config.signInFeature.formFields,
        (await options.req.getJSONBody()).formFields,
        tenantId,
        userContext
    );

    let session = await Session.getSession(
        options.req,
        options.res,
        {
            sessionRequired: false,
            overrideGlobalClaimValidators: () => [],
        },
        userContext
    );

    if (session !== undefined) {
        tenantId = session.getTenantId();
    }

    let result = await apiImplementation.signInPOST({
        formFields,
        tenantId,
        session,
        options,
        userContext,
    });

    if (result.status === "OK") {
        send200Response(options.res, {
            status: "OK",
            ...getBackwardsCompatibleUserInfo(options.req, result, userContext),
        });
    } else {
        send200Response(options.res, result);
    }
    return true;
}
