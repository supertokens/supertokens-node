import { RecipeInterface } from "./";
import { Querier } from "../../querier";
import NormalisedURLPath from "../../normalisedURLPath";
import { DEFAULT_TENANT_ID } from "./constants";

export default function getRecipeInterface(querier: Querier): RecipeInterface {
    return {
        getTenantId: async function ({ tenantIdFromFrontend }) {
            return tenantIdFromFrontend;
        },

        createOrUpdateTenant: async function ({ tenantId, config }) {
            let response = await querier.sendPutRequest(new NormalisedURLPath(`/recipe/multitenancy/tenant`), {
                tenantId,
                ...config,
            });

            return response;
        },

        deleteTenant: async function ({ tenantId }) {
            let response = await querier.sendPostRequest(new NormalisedURLPath(`/recipe/multitenancy/tenant/remove`), {
                tenantId,
            });

            return response;
        },

        getTenant: async function ({ tenantId }) {
            let response = await querier.sendGetRequest(
                new NormalisedURLPath(
                    `/${tenantId === undefined ? DEFAULT_TENANT_ID : tenantId}/recipe/multitenancy/tenant`
                ),
                {}
            );

            if (response.status === "TENANT_NOT_FOUND_ERROR") {
                return undefined;
            }

            return response;
        },

        listAllTenants: async function () {
            let response = await querier.sendGetRequest(new NormalisedURLPath(`/recipe/multitenancy/tenant/list`), {});
            return response;
        },

        createOrUpdateThirdPartyConfig: async function ({ tenantId, config, skipValidation }) {
            let response = await querier.sendPutRequest(
                new NormalisedURLPath(
                    `/${tenantId === undefined ? DEFAULT_TENANT_ID : tenantId}/recipe/multitenancy/config/thirdparty`
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
                new NormalisedURLPath(
                    `/${
                        tenantId === undefined ? DEFAULT_TENANT_ID : tenantId
                    }/recipe/multitenancy/config/thirdparty/remove`
                ),
                {
                    thirdPartyId,
                }
            );
            return response;
        },

        associateUserToTenant: async function ({ tenantId, recipeUserId }) {
            let response = await querier.sendPostRequest(
                new NormalisedURLPath(
                    `/${tenantId === undefined ? DEFAULT_TENANT_ID : tenantId}/recipe/multitenancy/tenant/user`
                ),
                {
                    userId: recipeUserId.getAsString(), // TODO: update CDI
                }
            );
            return response;
        },

        disassociateUserFromTenant: async function ({ tenantId, recipeUserId }) {
            let response = await querier.sendPostRequest(
                new NormalisedURLPath(
                    `/${tenantId === undefined ? DEFAULT_TENANT_ID : tenantId}/recipe/multitenancy/tenant/user/remove`
                ),
                {
                    userId: recipeUserId.getAsString(), // TODO: update CDI
                }
            );
            return response;
        },
    };
}
