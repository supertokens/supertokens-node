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

        associateUserToTenant: async function ({ tenantId, userId }) {
            let response = await querier.sendPostRequest(
                new NormalisedURLPath(
                    `/${tenantId === undefined ? DEFAULT_TENANT_ID : tenantId}/recipe/multitenancy/tenant/user`
                ),
                {
                    userId,
                }
            );
            return response;
        },

        disassociateUserFromTenant: async function ({ tenantId, userId }) {
            let response = await querier.sendPostRequest(
                new NormalisedURLPath(
                    `/${tenantId === undefined ? DEFAULT_TENANT_ID : tenantId}/recipe/multitenancy/tenant/user/remove`
                ),
                {
                    userId,
                }
            );
            return response;
        },
    };
}
