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
var __importDefault =
    (this && this.__importDefault) ||
    function (mod) {
        return mod && mod.__esModule ? mod : { default: mod };
    };
Object.defineProperty(exports, "__esModule", { value: true });
const normalisedURLPath_1 = __importDefault(require("../../normalisedURLPath"));
function getRecipeInterface(querier) {
    function copyAndRemoveUserContextAndTenantId(input) {
        let result = Object.assign({}, input);
        delete result.userContext;
        delete result.tenantId;
        return result;
    }
    return {
        consumeCode: function (input) {
            return __awaiter(this, void 0, void 0, function* () {
                let response = yield querier.sendPostRequest(
                    new normalisedURLPath_1.default(`/${input.tenantId}/recipe/signinup/code/consume`),
                    copyAndRemoveUserContextAndTenantId(input)
                );
                return response;
            });
        },
        createCode: function (input) {
            return __awaiter(this, void 0, void 0, function* () {
                let response = yield querier.sendPostRequest(
                    new normalisedURLPath_1.default(`/${input.tenantId}/recipe/signinup/code`),
                    copyAndRemoveUserContextAndTenantId(input)
                );
                return response;
            });
        },
        createNewCodeForDevice: function (input) {
            return __awaiter(this, void 0, void 0, function* () {
                let response = yield querier.sendPostRequest(
                    new normalisedURLPath_1.default(`/${input.tenantId}/recipe/signinup/code`),
                    copyAndRemoveUserContextAndTenantId(input)
                );
                return response;
            });
        },
        getUserByEmail: function (input) {
            return __awaiter(this, void 0, void 0, function* () {
                let response = yield querier.sendGetRequest(
                    new normalisedURLPath_1.default(`/${input.tenantId}/recipe/user`),
                    copyAndRemoveUserContextAndTenantId(input)
                );
                if (response.status === "OK") {
                    return response.user;
                }
                return undefined;
            });
        },
        getUserById: function (input) {
            return __awaiter(this, void 0, void 0, function* () {
                let response = yield querier.sendGetRequest(
                    new normalisedURLPath_1.default("/recipe/user"),
                    copyAndRemoveUserContextAndTenantId(input)
                );
                if (response.status === "OK") {
                    return response.user;
                }
                return undefined;
            });
        },
        getUserByPhoneNumber: function (input) {
            return __awaiter(this, void 0, void 0, function* () {
                let response = yield querier.sendGetRequest(
                    new normalisedURLPath_1.default(`/${input.tenantId}/recipe/user`),
                    copyAndRemoveUserContextAndTenantId(input)
                );
                if (response.status === "OK") {
                    return response.user;
                }
                return undefined;
            });
        },
        listCodesByDeviceId: function (input) {
            return __awaiter(this, void 0, void 0, function* () {
                let response = yield querier.sendGetRequest(
                    new normalisedURLPath_1.default(`/${input.tenantId}/recipe/signinup/codes`),
                    copyAndRemoveUserContextAndTenantId(input)
                );
                return response.devices.length === 1 ? response.devices[0] : undefined;
            });
        },
        listCodesByEmail: function (input) {
            return __awaiter(this, void 0, void 0, function* () {
                let response = yield querier.sendGetRequest(
                    new normalisedURLPath_1.default(`/${input.tenantId}/recipe/signinup/codes`),
                    copyAndRemoveUserContextAndTenantId(input)
                );
                return response.devices;
            });
        },
        listCodesByPhoneNumber: function (input) {
            return __awaiter(this, void 0, void 0, function* () {
                let response = yield querier.sendGetRequest(
                    new normalisedURLPath_1.default(`/${input.tenantId}/recipe/signinup/codes`),
                    copyAndRemoveUserContextAndTenantId(input)
                );
                return response.devices;
            });
        },
        listCodesByPreAuthSessionId: function (input) {
            return __awaiter(this, void 0, void 0, function* () {
                let response = yield querier.sendGetRequest(
                    new normalisedURLPath_1.default(`/${input.tenantId}/recipe/signinup/codes`),
                    copyAndRemoveUserContextAndTenantId(input)
                );
                return response.devices.length === 1 ? response.devices[0] : undefined;
            });
        },
        revokeAllCodes: function (input) {
            return __awaiter(this, void 0, void 0, function* () {
                yield querier.sendPostRequest(
                    new normalisedURLPath_1.default(`/${input.tenantId}/recipe/signinup/codes/remove`),
                    copyAndRemoveUserContextAndTenantId(input)
                );
                return {
                    status: "OK",
                };
            });
        },
        revokeCode: function (input) {
            return __awaiter(this, void 0, void 0, function* () {
                yield querier.sendPostRequest(
                    new normalisedURLPath_1.default(`/${input.tenantId}/recipe/signinup/code/remove`),
                    copyAndRemoveUserContextAndTenantId(input)
                );
                return { status: "OK" };
            });
        },
        updateUser: function (input) {
            return __awaiter(this, void 0, void 0, function* () {
                let response = yield querier.sendPutRequest(
                    new normalisedURLPath_1.default("/recipe/user"),
                    copyAndRemoveUserContextAndTenantId(input)
                );
                return response;
            });
        },
    };
}
exports.default = getRecipeInterface;
