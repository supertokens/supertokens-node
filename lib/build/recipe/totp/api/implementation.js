"use strict";
/* Copyright (c) 2024, VRAI Labs and/or its affiliates. All rights reserved.
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
var __createBinding =
    (this && this.__createBinding) ||
    (Object.create
        ? function (o, m, k, k2) {
              if (k2 === undefined) k2 = k;
              Object.defineProperty(o, k2, {
                  enumerable: true,
                  get: function () {
                      return m[k];
                  },
              });
          }
        : function (o, m, k, k2) {
              if (k2 === undefined) k2 = k;
              o[k2] = m[k];
          });
var __setModuleDefault =
    (this && this.__setModuleDefault) ||
    (Object.create
        ? function (o, v) {
              Object.defineProperty(o, "default", { enumerable: true, value: v });
          }
        : function (o, v) {
              o["default"] = v;
          });
var __importStar =
    (this && this.__importStar) ||
    function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null)
            for (var k in mod)
                if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
        __setModuleDefault(result, mod);
        return result;
    };
var __importDefault =
    (this && this.__importDefault) ||
    function (mod) {
        return mod && mod.__esModule ? mod : { default: mod };
    };
Object.defineProperty(exports, "__esModule", { value: true });
const multifactorauth_1 = __importStar(require("../../multifactorauth"));
const recipe_1 = __importDefault(require("../../multifactorauth/recipe"));
const error_1 = __importDefault(require("../../session/error"));
function getAPIInterface() {
    return {
        createDevicePOST: async function ({ deviceName, options, session, userContext }) {
            const userId = session.getUserId();
            let mfaInstance = recipe_1.default.getInstance();
            if (mfaInstance === undefined) {
                throw new Error("should never come here"); // If TOTP initialised, MFA is auto initialised. This should never happen.
            }
            await multifactorauth_1.default.assertAllowedToSetupFactorElseThrowInvalidClaimError(
                session,
                "totp",
                userContext
            );
            const createDeviceRes = await options.recipeImplementation.createDevice({
                userId,
                deviceName: deviceName,
                userContext: userContext,
            });
            if (createDeviceRes.status === "UNKNOWN_USER_ID_ERROR") {
                throw new error_1.default({
                    type: error_1.default.UNAUTHORISED,
                    message: "Session user not found",
                });
            } else {
                return createDeviceRes;
            }
        },
        listDevicesGET: async function ({ options, session, userContext }) {
            const userId = session.getUserId();
            return await options.recipeImplementation.listDevices({
                userId,
                userContext,
            });
        },
        removeDevicePOST: async function ({ deviceName, options, session, userContext }) {
            const userId = session.getUserId();
            const deviceList = await options.recipeImplementation.listDevices({
                userId,
                userContext,
            });
            if (deviceList.devices.some((device) => device.name === deviceName && device.verified)) {
                await session.assertClaims([
                    multifactorauth_1.MultiFactorAuthClaim.validators.hasCompletedMFARequirementsForAuth(),
                ]);
            }
            return await options.recipeImplementation.removeDevice({
                userId,
                deviceName,
                userContext,
            });
        },
        verifyDevicePOST: async function ({ deviceName, totp, options, session, userContext }) {
            const userId = session.getUserId();
            const tenantId = session.getTenantId();
            const mfaInstance = recipe_1.default.getInstance();
            if (mfaInstance === undefined) {
                throw new Error("should never come here"); // If TOTP initialised, MFA is auto initialised. This should never happen.
            }
            await multifactorauth_1.default.assertAllowedToSetupFactorElseThrowInvalidClaimError(
                session,
                "totp",
                userContext
            );
            const res = await options.recipeImplementation.verifyDevice({
                tenantId,
                userId,
                deviceName,
                totp,
                userContext,
            });
            if (res.status === "OK") {
                await mfaInstance.recipeInterfaceImpl.markFactorAsCompleteInSession({
                    session: session,
                    factorId: "totp",
                    userContext,
                });
            }
            return res;
        },
        verifyTOTPPOST: async function ({ totp, options, session, userContext }) {
            const userId = session.getUserId();
            const tenantId = session.getTenantId();
            const mfaInstance = recipe_1.default.getInstance();
            if (mfaInstance === undefined) {
                throw new Error("should never come here"); // If TOTP initialised, MFA is auto initialised. This should never happen.
            }
            const res = await options.recipeImplementation.verifyTOTP({
                tenantId,
                userId,
                totp,
                userContext,
            });
            if (res.status === "OK") {
                await mfaInstance.recipeInterfaceImpl.markFactorAsCompleteInSession({
                    session: session,
                    factorId: "totp",
                    userContext,
                });
            }
            return res;
        },
    };
}
exports.default = getAPIInterface;
