"use strict";
var __importDefault =
    (this && this.__importDefault) ||
    function (mod) {
        return mod && mod.__esModule ? mod : { default: mod };
    };
Object.defineProperty(exports, "__esModule", { value: true });
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
const twilio_1 = require("../../../../../ingredients/smsdelivery/services/twilio");
const twilio_2 = __importDefault(require("twilio"));
const supertokens_js_override_1 = __importDefault(require("supertokens-js-override"));
const serviceImplementation_1 = require("./serviceImplementation");
class TwilioService {
    constructor(config) {
        this.sendSms = async (input) => {
            let content = await this.serviceImpl.getContent(input);
            if ("from" in this.config.twilioSettings) {
                await this.serviceImpl.sendRawSms(
                    Object.assign(Object.assign({}, content), {
                        userContext: input.userContext,
                        from: this.config.twilioSettings.from,
                    })
                );
            } else {
                await this.serviceImpl.sendRawSms(
                    Object.assign(Object.assign({}, content), {
                        userContext: input.userContext,
                        messagingServiceSid: this.config.twilioSettings.messagingServiceSid,
                    })
                );
            }
        };
        this.config = (0, twilio_1.normaliseUserInputConfig)(config);
        const twilioClient = (0, twilio_2.default)(
            config.twilioSettings.accountSid,
            config.twilioSettings.authToken,
            config.twilioSettings.opts
        );
        let builder = new supertokens_js_override_1.default(
            (0, serviceImplementation_1.getServiceImplementation)(twilioClient)
        );
        if (config.override !== undefined) {
            builder = builder.override(config.override);
        }
        this.serviceImpl = builder.build();
    }
}
exports.default = TwilioService;
