import { RecipeInterface } from "./";
import { Querier } from "../../querier";

export default function getRecipeInterface(_: Querier): RecipeInterface {
    return {
        getTenantId: async function ({ tenantIdFromFrontend }) {
            return tenantIdFromFrontend;
        },

        createOrUpdateTenant: async function () {
            throw new Error("Not implemented");
        },

        deleteTenant: async function () {
            throw new Error("Not implemented");
        },

        getTenantConfig: async function () {
            throw new Error("Not implemented");
        },

        listAllTenants: async function () {
            throw new Error("Not implemented");
        },

        createOrUpdateThirdPartyConfig: async function () {
            throw new Error("Not implemented");
        },

        deleteThirdPartyConfig: async function () {
            throw new Error("Not implemented");
        },

        listThirdPartyConfigsForThirdPartyId: async function () {
            throw new Error("Not implemented");
        },
    };
}
