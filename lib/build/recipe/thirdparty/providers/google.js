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
function Google(input) {
    var _a;
    if (input.config.name === undefined) {
        input.config.name = "Google";
    }
    if (input.config.oidcDiscoveryEndpoint === undefined) {
        input.config.oidcDiscoveryEndpoint = "https://accounts.google.com/";
    }
    input.config.userInfoMap = Object.assign(Object.assign({}, input.config.userInfoMap), {
        fromUserInfoAPI: Object.assign(
            { userId: "id", email: "email", emailVerified: "email_verified" },
            (_a = input.config.userInfoMap) === null || _a === void 0 ? void 0 : _a.fromUserInfoAPI
        ),
    });
    input.config.authorizationEndpointQueryParams = Object.assign(
        { included_grant_scopes: "true", access_type: "offline" },
        input.config.authorizationEndpointQueryParams
    );
    const oOverride = input.override;
    input.override = function (originalImplementation) {
        const oGetConfig = originalImplementation.getConfigForClientType;
        originalImplementation.getConfigForClientType = function (input) {
            return __awaiter(this, void 0, void 0, function* () {
                const config = yield oGetConfig(input);
                if (config.scope === undefined) {
                    config.scope = ["openid", "email"];
                }
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
exports.default = Google;
