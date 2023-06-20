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
const constants_1 = require("./constants");
function getRecipeInterface(querier) {
    return {
        getTenantId: function ({ tenantIdFromFrontend }) {
            return __awaiter(this, void 0, void 0, function* () {
                // TODO
                return tenantIdFromFrontend;
            });
        },
        createOrUpdateTenant: function ({ tenantId, config }) {
            return __awaiter(this, void 0, void 0, function* () {
                let response = yield querier.sendPutRequest(
                    new normalisedURLPath_1.default(`/recipe/multitenancy/tenant`),
                    Object.assign({ tenantId }, config)
                );
                return response;
            });
        },
        deleteTenant: function ({ tenantId }) {
            return __awaiter(this, void 0, void 0, function* () {
                let response = yield querier.sendPostRequest(
                    new normalisedURLPath_1.default(`/recipe/multitenancy/tenant/remove`),
                    {
                        tenantId,
                    }
                );
                return response;
            });
        },
        getTenantConfig: function ({ tenantId }) {
            return __awaiter(this, void 0, void 0, function* () {
                let response = yield querier.sendGetRequest(
                    new normalisedURLPath_1.default(
                        `${
                            tenantId === undefined ? constants_1.DEFAULT_TENANT_ID : tenantId
                        }/recipe/multitenancy/tenant`
                    ),
                    {}
                );
                return {
                    status: response.status,
                    emailPassword: response.emailPassword,
                    passwordless: response.passwordless,
                    thirdParty: response.thirdParty,
                };
            });
        },
        listAllTenants: function () {
            return __awaiter(this, void 0, void 0, function* () {
                let response = yield querier.sendGetRequest(
                    new normalisedURLPath_1.default(`/recipe/multitenancy/tenant/list`),
                    {}
                );
                const tenants = response.tenants.map((item) => item.tenantId);
                return {
                    status: "OK",
                    tenants,
                };
            });
        },
        createOrUpdateThirdPartyConfig: function () {
            return __awaiter(this, void 0, void 0, function* () {
                // TODO
                throw new Error("Not implemented");
            });
        },
        deleteThirdPartyConfig: function () {
            return __awaiter(this, void 0, void 0, function* () {
                // TODO
                throw new Error("Not implemented");
            });
        },
        listThirdPartyConfigsForThirdPartyId: function () {
            return __awaiter(this, void 0, void 0, function* () {
                // TODO
                throw new Error("Not implemented");
            });
        },
    };
}
exports.default = getRecipeInterface;
