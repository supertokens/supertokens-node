import { RecipeInterface } from "./";
import { Querier } from "../../querier";

export default function getRecipeInterface(_: Querier): RecipeInterface {
    return {
        getTenantId: async function ({ tenantIdFromFrontend }) {
            // TODO
            return tenantIdFromFrontend;
        },

        createOrUpdateTenant: async function () {
            // TODO
            throw new Error("Not implemented");
        },

        deleteTenant: async function () {
            // TODO
            throw new Error("Not implemented");
        },

        getTenantConfig: async function () {
            // TODO
            throw new Error("Not implemented");
        },

        listAllTenants: async function () {
            // TODO
            throw new Error("Not implemented");
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
