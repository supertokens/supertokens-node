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
        createOrUpdateTenant: async function ({ tenantId, config, userContext }) {
            let response = await querier.sendPutRequest(
                new normalisedURLPath_1.default(`/recipe/multitenancy/tenant`),
                Object.assign({ tenantId }, config),
                userContext
            );
            return response;
        },
        deleteTenant: async function ({ tenantId, userContext }) {
            let response = await querier.sendPostRequest(
                new normalisedURLPath_1.default(`/recipe/multitenancy/tenant/remove`),
                {
                    tenantId,
                },
                userContext
            );
            return response;
        },
        getTenant: async function ({ tenantId, userContext }) {
            let response = await querier.sendGetRequest(
                new normalisedURLPath_1.default(
                    `/${tenantId === undefined ? constants_1.DEFAULT_TENANT_ID : tenantId}/recipe/multitenancy/tenant`
                ),
                {},
                userContext
            );
            if (response.status === "TENANT_NOT_FOUND_ERROR") {
                return undefined;
            }
            return response;
        },
        listAllTenants: async function ({ userContext }) {
            let response = await querier.sendGetRequest(
                new normalisedURLPath_1.default(`/recipe/multitenancy/tenant/list`),
                {},
                userContext
            );
            return response;
        },
        createOrUpdateThirdPartyConfig: async function ({ tenantId, config, skipValidation, userContext }) {
            let response = await querier.sendPutRequest(
                new normalisedURLPath_1.default(
                    `/${
                        tenantId === undefined ? constants_1.DEFAULT_TENANT_ID : tenantId
                    }/recipe/multitenancy/config/thirdparty`
                ),
                {
                    config,
                    skipValidation,
                },
                userContext
            );
            return response;
        },
        deleteThirdPartyConfig: async function ({ tenantId, thirdPartyId, userContext }) {
            let response = await querier.sendPostRequest(
                new normalisedURLPath_1.default(
                    `/${
                        tenantId === undefined ? constants_1.DEFAULT_TENANT_ID : tenantId
                    }/recipe/multitenancy/config/thirdparty/remove`
                ),
                {
                    thirdPartyId,
                },
                userContext
            );
            return response;
        },
        associateUserToTenant: async function ({ tenantId, recipeUserId, userContext }) {
            let response = await querier.sendPostRequest(
                new normalisedURLPath_1.default(
                    `/${
                        tenantId === undefined ? constants_1.DEFAULT_TENANT_ID : tenantId
                    }/recipe/multitenancy/tenant/user`
                ),
                {
                    recipeUserId: recipeUserId.getAsString(),
                },
                userContext
            );
            return response;
        },
        disassociateUserFromTenant: async function ({ tenantId, recipeUserId, userContext }) {
            let response = await querier.sendPostRequest(
                new normalisedURLPath_1.default(
                    `/${
                        tenantId === undefined ? constants_1.DEFAULT_TENANT_ID : tenantId
                    }/recipe/multitenancy/tenant/user/remove`
                ),
                {
                    recipeUserId: recipeUserId.getAsString(),
                },
                userContext
            );
            return response;
        },
    };
}
exports.default = getRecipeInterface;
