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
Object.defineProperty(exports, "__esModule", { value: true });
const custom_1 = require("./custom");
function Discord(input) {
    var _a;
    if (input.config.name === undefined) {
        input.config.name = "Discord";
    }
    if (input.config.authorizationEndpoint === undefined) {
        input.config.authorizationEndpoint = "https://discord.com/oauth2/authorize";
    }
    if (input.config.tokenEndpoint === undefined) {
        input.config.tokenEndpoint = "https://discord.com/api/oauth2/token";
    }
    if (input.config.userInfoEndpoint === undefined) {
        input.config.userInfoEndpoint = "https://discord.com/api/users/@me";
    }
    input.config.userInfoMap = Object.assign(Object.assign({}, input.config.userInfoMap), {
        fromUserInfoAPI: Object.assign(
            { userId: "id", email: "email", emailVerified: "verified" },
            (_a = input.config.userInfoMap) === null || _a === void 0 ? void 0 : _a.fromUserInfoAPI
        ),
    });
    const oOverride = input.override;
    input.override = function (originalImplementation) {
        const oGetConfig = originalImplementation.getConfigForClientType;
        originalImplementation.getConfigForClientType = function ({ clientType, userContext }) {
            return __awaiter(this, void 0, void 0, function* () {
                const config = yield oGetConfig({ clientType, userContext });
                if (config.scope === undefined) {
                    config.scope = ["identify", "email"];
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
exports.default = Discord;
