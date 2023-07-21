"use strict";
var __awaiter =
    (this && this.__awaiter) ||
    function (thisArg, _arguments, P, generator) {
        function adopt(value) {
            return value instanceof P
                ? value
                : new P(function (resolve) {
                      resolve(value);
                  });
        }
        return new (P || (P = Promise))(function (resolve, reject) {
            function fulfilled(value) {
                try {
                    step(generator.next(value));
                } catch (e) {
                    reject(e);
                }
            }
            function rejected(value) {
                try {
                    step(generator["throw"](value));
                } catch (e) {
                    reject(e);
                }
            }
            function step(result) {
                result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
            }
            step((generator = generator.apply(thisArg, _arguments || [])).next());
        });
    };
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
        originalImplementation.getConfigForClientType = function (input) {
            return __awaiter(this, void 0, void 0, function* () {
                const config = yield oGetConfig(input);
                if (config.oidcDiscoveryEndpoint === undefined) {
                    if (config.additionalConfig == undefined || config.additionalConfig.oktaDomain == undefined) {
                        throw new Error("Please provide the oktaDomain in the additionalConfig of the Okta provider.");
                    }
                    config.oidcDiscoveryEndpoint = `${config.additionalConfig.oktaDomain}.okta.com`;
                }
                if (config.scope === undefined) {
                    config.scope = ["openid", "email"];
                }
                // TODO later if required, client assertion impl
                return config;
            });
        };
        if (oOverride !== undefined) {
            originalImplementation = oOverride(originalImplementation);
        }
        return originalImplementation;
    };
    return custom_1.default(input);
}
exports.default = Okta;
