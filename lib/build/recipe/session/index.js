"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
const querier_1 = require("../../querier");
function getRecipeId() {
    return "session";
}
exports.getRecipeId = getRecipeId;
function getQuerier() {
    return querier_1.Querier.getInstanceOrThrowError(getRecipeId());
}
exports.getQuerier = getQuerier;
// TODO: register resetters
// TODO: CORS
// TODO: middleware
// TODO: error handlers
// TODO: routing
// TODO: other stuff from the issue
// TODO: export
//# sourceMappingURL=index.js.map
