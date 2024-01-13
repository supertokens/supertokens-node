"use strict";
var __importDefault =
    (this && this.__importDefault) ||
    function (mod) {
        return mod && mod.__esModule ? mod : { default: mod };
    };
Object.defineProperty(exports, "__esModule", { value: true });
const custom_1 = __importDefault(require("./custom"));
function Okta(input) {
    if (input.config.name === undefined) {
        input.config.name = "Okta";
    }
    const oOverride = input.override;
    input.override = function (originalImplementation) {
        const oGetConfig = originalImplementation.getConfigForClientType;
        originalImplementation.getConfigForClientType = async function (input) {
            const config = await oGetConfig(input);
            if (config.oidcDiscoveryEndpoint === undefined) {
                if (config.additionalConfig == undefined || config.additionalConfig.oktaDomain == undefined) {
                    throw new Error("Please provide the oktaDomain in the additionalConfig of the Okta provider.");
                }
                config.oidcDiscoveryEndpoint = `${config.additionalConfig.oktaDomain}`;
            }
            if (config.scope === undefined) {
                config.scope = ["openid", "email"];
            }
            // TODO later if required, client assertion impl
            return config;
        };
        if (oOverride !== undefined) {
            originalImplementation = oOverride(originalImplementation);
        }
        return originalImplementation;
    };
    return custom_1.default(input);
}
exports.default = Okta;
