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
var __importDefault =
    (this && this.__importDefault) ||
    function (mod) {
        return mod && mod.__esModule ? mod : { default: mod };
    };
Object.defineProperty(exports, "__esModule", { value: true });
exports.getServiceImplementation = getServiceImplementation;
const passwordReset_1 = __importDefault(require("../passwordReset"));
function getServiceImplementation(transporter, from) {
    return {
        sendRawEmail: async function (input) {
            if (input.isHtml) {
                await transporter.sendMail({
                    from: `${from.name} <${from.email}>`,
                    to: input.toEmail,
                    subject: input.subject,
                    html: input.body,
                });
            } else {
                await transporter.sendMail({
                    from: `${from.name} <${from.email}>`,
                    to: input.toEmail,
                    subject: input.subject,
                    text: input.body,
                });
            }
        },
        getContent: async function (input) {
            return (0, passwordReset_1.default)(input);
        },
    };
}
