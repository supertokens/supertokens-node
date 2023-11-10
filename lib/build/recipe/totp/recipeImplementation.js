"use strict";
var __importDefault =
    (this && this.__importDefault) ||
    function (mod) {
        return mod && mod.__esModule ? mod : { default: mod };
    };
Object.defineProperty(exports, "__esModule", { value: true });
const normalisedURLPath_1 = __importDefault(require("../../normalisedURLPath"));
function getRecipeInterface(querier) {
    return {
        createDevice: async (input) => {
            return await querier.sendPostRequest(new normalisedURLPath_1.default("/recipe/totp/device"), {
                userId: input.userId,
                deviceName: input.deviceName,
                userContext: input.userContext,
            });
        },
        updateDevice: (input) => {
            return querier.sendPutRequest(new normalisedURLPath_1.default("/recipe/totp/device"), {
                userId: input.userId,
                deviceName: input.existingDeviceName,
                newDeviceName: input.newDeviceName,
                userContext: input.userContext,
            });
        },
        listDevices: (input) => {
            return querier.sendGetRequest(new normalisedURLPath_1.default("/recipe/totp/device/list"), {
                userId: input.userId,
                userContext: input.userContext,
            });
        },
        removeDevice: (input) => {
            return querier.sendPostRequest(new normalisedURLPath_1.default("/recipe/totp/device/remove"), {
                userId: input.userId,
                deviceName: input.deviceName,
                userContext: input.userContext,
            });
        },
        verifyDevice: (input) => {
            return querier.sendPostRequest(
                new normalisedURLPath_1.default(`${input.tenantId}/recipe/totp/device/verify`),
                {
                    userId: input.userId,
                    deviceName: input.deviceName,
                    totp: input.totp,
                    userContext: input.userContext,
                }
            );
        },
        verifyTOTP: (input) => {
            return querier.sendPostRequest(new normalisedURLPath_1.default(`${input.tenantId}/recipe/totp/verify`), {
                userId: input.userId,
                totp: input.totp,
                userContext: input.userContext,
            });
        },
    };
}
exports.default = getRecipeInterface;
