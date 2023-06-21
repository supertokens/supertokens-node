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
        getTenant: function ({ tenantId }) {
            return __awaiter(this, void 0, void 0, function* () {
                let response = yield querier.sendGetRequest(
                    new normalisedURLPath_1.default(
                        `/${
                            tenantId === undefined ? constants_1.DEFAULT_TENANT_ID : tenantId
                        }/recipe/multitenancy/tenant`
                    ),
                    {}
                );
                return response;
            });
        },
        listAllTenants: function () {
            return __awaiter(this, void 0, void 0, function* () {
                let response = yield querier.sendGetRequest(
                    new normalisedURLPath_1.default(`/recipe/multitenancy/tenant/list`),
                    {}
                );
                return response;
            });
        },
        createOrUpdateThirdPartyConfig: function ({ tenantId, config, skipValidation }) {
            return __awaiter(this, void 0, void 0, function* () {
                let response = yield querier.sendPutRequest(
                    new normalisedURLPath_1.default(
                        `/${
                            tenantId === undefined ? constants_1.DEFAULT_TENANT_ID : tenantId
                        }/recipe/multitenancy/config/thirdparty`
                    ),
                    {
                        config,
                        skipValidation,
                    }
                );
                return response;
            });
        },
        deleteThirdPartyConfig: function ({ tenantId, thirdPartyId }) {
            return __awaiter(this, void 0, void 0, function* () {
                let response = yield querier.sendPostRequest(
                    new normalisedURLPath_1.default(
                        `/${
                            tenantId === undefined ? constants_1.DEFAULT_TENANT_ID : tenantId
                        }/recipe/multitenancy/config/thirdparty/remove`
                    ),
                    {
                        thirdPartyId,
                    }
                );
                return response;
            });
        },
        associateUserToTenant: function ({ tenantId, userId }) {
            return __awaiter(this, void 0, void 0, function* () {
                let response = yield querier.sendPostRequest(
                    new normalisedURLPath_1.default(
                        `/${
                            tenantId === undefined ? constants_1.DEFAULT_TENANT_ID : tenantId
                        }/recipe/multitenancy/tenant/user`
                    ),
                    {
                        userId,
                    }
                );
                return response;
            });
        },
        disassociateUserFromTenant: function ({ tenantId, userId }) {
            return __awaiter(this, void 0, void 0, function* () {
                let response = yield querier.sendPostRequest(
                    new normalisedURLPath_1.default(
                        `/${
                            tenantId === undefined ? constants_1.DEFAULT_TENANT_ID : tenantId
                        }/recipe/multitenancy/tenant/user/remove`
                    ),
                    {
                        userId,
                    }
                );
                return response;
            });
        },
    };
}
exports.default = getRecipeInterface;
