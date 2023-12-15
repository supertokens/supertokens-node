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

import { TypeThirdPartyPasswordlessEmailDeliveryInput } from "../../../../types";
import {
    ServiceInterface,
    TypeInputSendRawEmail,
    GetContentResult,
} from "../../../../../../ingredients/emaildelivery/services/smtp";
import { TypePasswordlessEmailDeliveryInput } from "../../../../../passwordless/types";
import { UserContext } from "../../../../../../types";

export default function getServiceInterface(
    thirdpartyPasswordlessServiceImplementation: ServiceInterface<TypeThirdPartyPasswordlessEmailDeliveryInput>
): ServiceInterface<TypePasswordlessEmailDeliveryInput> {
    return {
        sendRawEmail: async function (input: TypeInputSendRawEmail) {
            return thirdpartyPasswordlessServiceImplementation.sendRawEmail(input);
        },
        getContent: async function (
            input: TypePasswordlessEmailDeliveryInput & { userContext: UserContext }
        ): Promise<GetContentResult> {
            return await thirdpartyPasswordlessServiceImplementation.getContent(input);
        },
    };
}
