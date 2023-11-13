"use strict";
var __importDefault =
    (this && this.__importDefault) ||
    function (mod) {
        return mod && mod.__esModule ? mod : { default: mod };
    };
Object.defineProperty(exports, "__esModule", { value: true });
const normalisedURLPath_1 = __importDefault(require("../../normalisedURLPath"));
function getRecipeInterface(querier, config) {
    return {
        createDevice: async (input) => {
            var _a, _b;
            const response = await querier.sendPostRequest(new normalisedURLPath_1.default("/recipe/totp/device"), {
                userId: input.userId,
                deviceName: input.deviceName,
                skew: (_a = input.skew) !== null && _a !== void 0 ? _a : config.defaultSkew,
                period: (_b = input.period) !== null && _b !== void 0 ? _b : config.defaultPeriod,
                userContext: input.userContext,
            });
            return Object.assign(Object.assign({}, response), {
                qrCodeString: encodeURI(
                    `otpauth://totp/${config.issuer}${
                        input.userIdentifierInfo !== undefined ? ":" + input.userIdentifierInfo : ""
                    }` + `?secret=${response.secret}&issuer=${config.issuer}`
                ),
            });
        },
        updateDevice: (input) => {
            return querier.sendPutRequest(new normalisedURLPath_1.default("/recipe/totp/device"), {
                userId: input.userId,
                existingDeviceName: input.existingDeviceName,
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
