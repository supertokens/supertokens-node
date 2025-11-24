"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = getRecipeInterface;
const constants_1 = require("./constants");
function getRecipeInterface(querier) {
    return {
        getTenantId: async function ({ tenantIdFromFrontend }) {
            return tenantIdFromFrontend;
        },
        createOrUpdateTenant: async function ({ tenantId, config, userContext }) {
            let response = await querier.sendPutRequest(
                "/recipe/multitenancy/tenant/v2",
                Object.assign({ tenantId }, config),
                {},
                userContext
            );
            return response;
        },
        deleteTenant: async function ({ tenantId, userContext }) {
            let response = await querier.sendPostRequest(
                "/recipe/multitenancy/tenant/remove",
                {
                    tenantId,
                },
                userContext
            );
            return response;
        },
        getTenant: async function ({ tenantId, userContext }) {
            let response = await querier.sendGetRequest(
                {
                    path: "/<tenantId>/recipe/multitenancy/tenant/v2",
                    params: {
                        tenantId: tenantId === undefined ? constants_1.DEFAULT_TENANT_ID : tenantId,
                    },
                },
                {},
                userContext
            );
            if (response.status === "TENANT_NOT_FOUND_ERROR") {
                return undefined;
            }
            return response;
        },
        listAllTenants: async function ({ userContext }) {
            let response = await querier.sendGetRequest("/recipe/multitenancy/tenant/list/v2", {}, userContext);
            return response;
        },
        createOrUpdateThirdPartyConfig: async function ({ tenantId, config, skipValidation, userContext }) {
            let response = await querier.sendPutRequest(
                {
                    path: "/<tenantId>/recipe/multitenancy/config/thirdparty",
                    params: {
                        tenantId: tenantId === undefined ? constants_1.DEFAULT_TENANT_ID : tenantId,
                    },
                },
                {
                    config,
                    skipValidation,
                },
                {},
                userContext
            );
            return response;
        },
        deleteThirdPartyConfig: async function ({ tenantId, thirdPartyId, userContext }) {
            let response = await querier.sendPostRequest(
                {
                    path: "/<tenantId>/recipe/multitenancy/config/thirdparty/remove",
                    params: {
                        tenantId: tenantId === undefined ? constants_1.DEFAULT_TENANT_ID : tenantId,
                    },
                },
                {
                    thirdPartyId,
                },
                userContext
            );
            return response;
        },
        associateUserToTenant: async function ({ tenantId, recipeUserId, userContext }) {
            let response = await querier.sendPostRequest(
                {
                    path: "/<tenantId>/recipe/multitenancy/tenant/user",
                    params: {
                        tenantId: tenantId === undefined ? constants_1.DEFAULT_TENANT_ID : tenantId,
                    },
                },
                {
                    recipeUserId: recipeUserId.getAsString(),
                },
                userContext
            );
            return response;
        },
        disassociateUserFromTenant: async function ({ tenantId, recipeUserId, userContext }) {
            let response = await querier.sendPostRequest(
                {
                    path: "/<tenantId>/recipe/multitenancy/tenant/user/remove",
                    params: {
                        tenantId: tenantId === undefined ? constants_1.DEFAULT_TENANT_ID : tenantId,
                    },
                },
                {
                    recipeUserId: recipeUserId.getAsString(),
                },
                userContext
            );
            return response;
        },
    };
}
