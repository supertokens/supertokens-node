"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function getAPIImplementation() {
    return {
        getOpenIdDiscoveryConfigurationGET: async function ({ options, userContext }) {
            return await options.recipeImplementation.getOpenIdDiscoveryConfiguration({ userContext });
        },
    };
}
exports.default = getAPIImplementation;
