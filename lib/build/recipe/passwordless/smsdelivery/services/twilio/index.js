"use strict";
var __awaiter =
    (this && this.__awaiter) ||
    function (thisArg, _arguments, P, generator) {
        function adopt(value) {
            return value instanceof P
                ? value
                : new P(function (resolve) {
                      resolve(value);
                  });
        }
        return new (P || (P = Promise))(function (resolve, reject) {
            function fulfilled(value) {
                try {
                    step(generator.next(value));
                } catch (e) {
                    reject(e);
                }
            }
            function rejected(value) {
                try {
                    step(generator["throw"](value));
                } catch (e) {
                    reject(e);
                }
            }
            function step(result) {
                result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
            }
            step((generator = generator.apply(thisArg, _arguments || [])).next());
        });
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
const Twilio = require("twilio");
const supertokens_js_override_1 = require("supertokens-js-override");
const serviceImplementation_1 = require("./serviceImplementation");
class TwilioService {
    constructor(config) {
        this.sendSms = (input) =>
            __awaiter(this, void 0, void 0, function* () {
                let content = yield this.serviceImpl.getContent(input);
                if ("from" in this.config.twilioSettings) {
                    yield this.serviceImpl.sendRawSms(
                        Object.assign(Object.assign({}, content), {
                            userContext: input.userContext,
                            from: this.config.twilioSettings.from,
                        })
                    );
                } else {
                    yield this.serviceImpl.sendRawSms(
                        Object.assign(Object.assign({}, content), {
                            userContext: input.userContext,
                            messagingServiceSid: this.config.twilioSettings.messagingServiceSid,
                        })
                    );
                }
            });
        this.config = twilio_1.normaliseUserInputConfig(config);
        const twilioClient = Twilio(
            config.twilioSettings.accountSid,
            config.twilioSettings.authToken,
            config.twilioSettings.opts
        );
        let builder = new supertokens_js_override_1.default(
            serviceImplementation_1.getServiceImplementation(twilioClient)
        );
        if (config.override !== undefined) {
            builder = builder.override(config.override);
        }
        this.serviceImpl = builder.build();
    }
}
exports.default = TwilioService;
