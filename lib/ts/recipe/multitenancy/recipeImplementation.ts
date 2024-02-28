import { RecipeInterface } from "./";
import { Querier } from "../../querier";
import NormalisedURLPath from "../../normalisedURLPath";
import { DEFAULT_TENANT_ID } from "./constants";

export default function getRecipeInterface(querier: Querier): RecipeInterface {
    return {
        getTenantId: async function ({ tenantIdFromFrontend }) {
            return tenantIdFromFrontend;
        },

        createOrUpdateTenant: async function ({ tenantId, config, userContext }) {
            let response = await querier.sendPutRequest(
                new NormalisedURLPath(`/recipe/multitenancy/tenant`),
                {
                    tenantId,
                    ...config,
                },
                userContext
            );

            return response;
        },

        deleteTenant: async function ({ tenantId, userContext }) {
            let response = await querier.sendPostRequest(
                new NormalisedURLPath(`/recipe/multitenancy/tenant/remove`),
                {
                    tenantId,
                },
                userContext
            );

            return response;
        },

        getTenant: async function ({ tenantId, userContext }) {
            let response = await querier.sendGetRequest(
                new NormalisedURLPath(
                    `/${tenantId === undefined ? DEFAULT_TENANT_ID : tenantId}/recipe/multitenancy/tenant`
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
                new NormalisedURLPath(`/recipe/multitenancy/tenant/list`),
                {},
                userContext
            );
            return response;
        },

        createOrUpdateThirdPartyConfig: async function ({ tenantId, config, skipValidation, userContext }) {
            let response = await querier.sendPutRequest(
                new NormalisedURLPath(
                    `/${tenantId === undefined ? DEFAULT_TENANT_ID : tenantId}/recipe/multitenancy/config/thirdparty`
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
                new NormalisedURLPath(
                    `/${
                        tenantId === undefined ? DEFAULT_TENANT_ID : tenantId
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
                new NormalisedURLPath(
                    `/${tenantId === undefined ? DEFAULT_TENANT_ID : tenantId}/recipe/multitenancy/tenant/user`
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
                new NormalisedURLPath(
                    `/${tenantId === undefined ? DEFAULT_TENANT_ID : tenantId}/recipe/multitenancy/tenant/user/remove`
                ),
                {
                    recipeUserId: recipeUserId.getAsString(),
                },
                userContext
            );
            return response;
        },

        listAllCoreConfigProperties: async function ({ userContext }) {
            let response = await querier.sendGetRequest(new NormalisedURLPath(`/core-config/list`), {}, userContext);
            return response;
        },
    };
}
