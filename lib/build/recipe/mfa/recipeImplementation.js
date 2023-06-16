"use strict";
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
var __rest =
    (this && this.__rest) ||
    function (s, e) {
        var t = {};
        for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0) t[p] = s[p];
        if (s != null && typeof Object.getOwnPropertySymbols === "function")
            for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
                if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i])) t[p[i]] = s[p[i]];
            }
        return t;
    };
var __importDefault =
    (this && this.__importDefault) ||
    function (mod) {
        return mod && mod.__esModule ? mod : { default: mod };
    };
Object.defineProperty(exports, "__esModule", { value: true });
const normalisedURLPath_1 = __importDefault(require("../../normalisedURLPath"));
const __1 = require("../..");
const totp_1 = require("../totp");
const mfaClaim_1 = require("./mfaClaim");
const recipe_1 = __importDefault(require("./recipe"));
function getRecipeInterface(querier, config) {
    return {
        getNextFactors: function (input) {
            return __awaiter(this, void 0, void 0, function* () {
                return input.enabledByUser;
            });
        },
        getFirstFactors: function (_) {
            return __awaiter(this, void 0, void 0, function* () {
                return config.defaultFirstFactors;
            });
        },
        completeFactorInSession: function (input) {
            var _a;
            return __awaiter(this, void 0, void 0, function* () {
                // const  await input.session.getClaimValue(MFAClaim)
                let value =
                    (_a = yield input.session.getClaimValue(mfaClaim_1.MfaClaim, input.userContext)) !== null &&
                    _a !== void 0
                        ? _a
                        : { c: {}, next: [] };
                const MFARecipeImpl = recipe_1.default.getInstanceOrThrowError().recipeInterfaceImpl;
                const completedFactors = Object.keys(value.c);
                const enabledByUser = yield MFARecipeImpl.getAllFactorsEnabledForUser({
                    tenantId: "public",
                    userId: input.session.getUserId(),
                    userContext: input.userContext,
                });
                const nextFactors = yield MFARecipeImpl.getNextFactors({
                    session: input.session,
                    completedFactors,
                    enabledByUser,
                    userContext: input.userContext,
                });
                value.next = [];
                value.c[input.factorId] = new Date().getTime();
                // Insert items from nextFactors into value.next if they don't already exist in value.c
                for (const factorId of nextFactors) {
                    if (value.c[factorId] === undefined) {
                        value.next.push(factorId);
                    }
                }
                yield input.session.setClaimValue(mfaClaim_1.MfaClaim, value, input.userContext);
            });
        },
        isFactorAlreadySetup: function (input) {
            return __awaiter(this, void 0, void 0, function* () {
                const firstFactorUser = yield __1.getUser(input.session.getUserId(), input.userContext);
                if (firstFactorUser === undefined) {
                    throw new Error(`User doesn't exist`); // shouldn't happen
                }
                // Handles emailpassword, passwordless, thirdparty recipe users
                if (
                    input.factorId === "emailpassword" ||
                    input.factorId === "thirdparty" ||
                    input.factorId === "passwordless"
                ) {
                    const loginMethod = firstFactorUser.loginMethods.find((m) => m.recipeId === input.factorId);
                    return loginMethod !== undefined;
                }
                if (input.factorId === "totp") {
                    const totpDevices = yield totp_1.listDevices({ userId: input.session.getUserId() });
                    return totpDevices.status === "OK" && totpDevices.devices.length > 0; // FIXME: check for verified devices?
                }
                throw new Error(`Unknown factor id ${input.factorId}`); // FIXME: Should return a status instead of raising error?
            });
        },
        getUserIdForFactor: function (input) {
            return __awaiter(this, void 0, void 0, function* () {
                return input.session.getUserId(); // FIXME
            });
        },
        setUserIdForFactor: function (_input) {
            return __awaiter(this, void 0, void 0, function* () {});
        },
        getPrimaryUserIdForFactor: function (_input) {
            return __awaiter(this, void 0, void 0, function* () {
                return undefined; // FIXME
            });
        },
        enableFactorForUser: function (input) {
            return __awaiter(this, void 0, void 0, function* () {
                const { userContext } = input,
                    rest = __rest(input, ["userContext"]);
                const response = yield querier.sendPostRequest(
                    new normalisedURLPath_1.default("/recipe/mfa/enable"),
                    Object.assign({}, rest)
                );
                return response; // TODO: Verify type?
            });
        },
        getAllFactorsEnabledForUser: function (_input) {
            return __awaiter(this, void 0, void 0, function* () {
                // const { userContext, ...rest } = input;
                // const response = await querier.sendGetRequest(new NormalisedURLPath("/recipe/mfa/factors/list"), {
                //     ...rest,
                // });
                // return response; // TODO: Verify type?
                // return ["emailpassword", "passwordless"];
                return ["thirdparty", "emailpassword"];
            });
        },
        disableFactorForUser: function (input) {
            return __awaiter(this, void 0, void 0, function* () {
                const { userContext } = input,
                    rest = __rest(input, ["userContext"]);
                const response = yield querier.sendPostRequest(
                    new normalisedURLPath_1.default("/recipe/mfa/disable"),
                    Object.assign({}, rest)
                );
                return response; // TODO: Verify type?
            });
        },
    };
}
exports.default = getRecipeInterface;
