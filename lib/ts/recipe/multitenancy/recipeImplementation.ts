import { RecipeInterface } from "./";
import { Querier } from "../../querier";
import NormalisedURLPath from "../../normalisedURLPath";
import { DEFAULT_TENANT_ID } from "./constants";
import { ProviderConfig } from "../thirdparty/types";

export default function getRecipeInterface(querier: Querier): RecipeInterface {
    return {
        getTenantId: async function ({ tenantIdFromFrontend }) {
            // TODO do we need this function?
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
                    `/${tenantId === undefined ? DEFAULT_TENANT_ID : tenantId}/recipe/multitenancy/tenant`
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

        listThirdPartyConfigsForThirdPartyId: async function ({ thirdPartyId }) {
            let response = await querier.sendGetRequest(new NormalisedURLPath(`/recipe/multitenancy/tenant/list`), {});

            let result: {
                status: "OK";
                tenants: {
                    tenantId: string;
                    providers: ProviderConfig[];
                }[];
            } = {
                status: "OK",
                tenants: [],
            };

            for (const tenant of response.tenants) {
                result.tenants.push({
                    tenantId: tenant.tenantId,
                    providers: tenant.thirdParty.providers.filter(
                        (provider: any) => provider.thirdPartyId === thirdPartyId
                    ),
                });
            }

            return result;
        },
    };
}
