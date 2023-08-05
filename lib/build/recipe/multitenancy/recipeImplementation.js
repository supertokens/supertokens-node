"use strict";
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
        getTenantId: async function ({ tenantIdFromFrontend }) {
            return tenantIdFromFrontend;
        },
        createOrUpdateTenant: async function ({ tenantId, config }) {
            let response = await querier.sendPutRequest(
                new normalisedURLPath_1.default(`/recipe/multitenancy/tenant`),
                Object.assign({ tenantId }, config)
            );
            return response;
        },
        deleteTenant: async function ({ tenantId }) {
            let response = await querier.sendPostRequest(
                new normalisedURLPath_1.default(`/recipe/multitenancy/tenant/remove`),
                {
                    tenantId,
                }
            );
            return response;
        },
        getTenant: async function ({ tenantId }) {
            let response = await querier.sendGetRequest(
                new normalisedURLPath_1.default(
                    `/${tenantId === undefined ? constants_1.DEFAULT_TENANT_ID : tenantId}/recipe/multitenancy/tenant`
                ),
                {}
            );
            if (response.status === "TENANT_NOT_FOUND_ERROR") {
                return undefined;
            }
            return response;
        },
        listAllTenants: async function () {
            let response = await querier.sendGetRequest(
                new normalisedURLPath_1.default(`/recipe/multitenancy/tenant/list`),
                {}
            );
            return response;
        },
        createOrUpdateThirdPartyConfig: async function ({ tenantId, config, skipValidation }) {
            let response = await querier.sendPutRequest(
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
        },
        deleteThirdPartyConfig: async function ({ tenantId, thirdPartyId }) {
            let response = await querier.sendPostRequest(
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
        },
        associateUserToTenant: async function ({ tenantId, userId }) {
            let response = await querier.sendPostRequest(
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
        },
        disassociateUserFromTenant: async function ({ tenantId, userId }) {
            let response = await querier.sendPostRequest(
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
        },
    };
}
exports.default = getRecipeInterface;
