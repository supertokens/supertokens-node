"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = getAPIImplementation;
function getAPIImplementation() {
    return {
        getOpenIdDiscoveryConfigurationGET: async function ({ options, userContext }) {
            return await options.recipeImplementation.getOpenIdDiscoveryConfiguration({ userContext });
        },
    };
}
