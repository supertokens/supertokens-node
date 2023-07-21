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
const google_1 = __importDefault(require("./google"));
function GoogleWorkspaces(input) {
    if (input.config.name === undefined) {
        input.config.name = "Google Workspaces";
    }
    if (input.config.validateIdTokenPayload === undefined) {
        input.config.validateIdTokenPayload = function (input) {
            var _a, _b, _c;
            return __awaiter(this, void 0, void 0, function* () {
                if (
                    ((_a = input.clientConfig.additionalConfig) === null || _a === void 0 ? void 0 : _a.hd) !==
                        undefined &&
                    ((_b = input.clientConfig.additionalConfig) === null || _b === void 0 ? void 0 : _b.hd) !== "*"
                ) {
                    if (
                        ((_c = input.clientConfig.additionalConfig) === null || _c === void 0 ? void 0 : _c.hd) !==
                        input.idTokenPayload.hd
                    ) {
                        throw new Error(
                            "the value for hd claim in the id token does not match the value provided in the config"
                        );
                    }
                }
            });
        };
    }
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
                config.additionalConfig = Object.assign({ hd: "*" }, config.additionalConfig);
                config.authorizationEndpointQueryParams = Object.assign(
                    Object.assign({}, config.authorizationEndpointQueryParams),
                    { hd: config.additionalConfig.hd }
                );
                return config;
            });
        };
        if (oOverride !== undefined) {
            originalImplementation = oOverride(originalImplementation);
        }
        return originalImplementation;
    };
    return google_1.default(input);
}
exports.default = GoogleWorkspaces;
