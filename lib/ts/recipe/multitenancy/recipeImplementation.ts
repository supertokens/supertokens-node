import { RecipeInterface } from "./";
import { Querier } from "../../querier";
import NormalisedURLPath from "../../normalisedURLPath";
import { DEFAULT_TENANT_ID } from "./constants";

export default function getRecipeInterface(querier: Querier): RecipeInterface {
    return {
        getTenantId: async function ({ tenantIdFromFrontend }) {
            // TODO
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

        getTenantConfig: async function ({ tenantId }) {
            let response = await querier.sendGetRequest(
                new NormalisedURLPath(
                    `${tenantId === undefined ? DEFAULT_TENANT_ID : tenantId}/recipe/multitenancy/tenant`
                ),
                {}
            );

            return {
                status: response.status,
                emailPassword: response.emailPassword,
                passwordless: response.passwordless,
                thirdParty: response.thirdParty,
            };
        },

        listAllTenants: async function () {
            let response = await querier.sendGetRequest(new NormalisedURLPath(`/recipe/multitenancy/tenant/list`), {});

            const tenants: string[] = response.tenants.map((item: any) => item.tenantId);
            return {
                status: "OK",
                tenants,
            };
        },

        createOrUpdateThirdPartyConfig: async function () {
            // TODO
            throw new Error("Not implemented");
        },

        deleteThirdPartyConfig: async function () {
            // TODO
            throw new Error("Not implemented");
        },

        listThirdPartyConfigsForThirdPartyId: async function () {
            // TODO
            throw new Error("Not implemented");
        },
    };
}
