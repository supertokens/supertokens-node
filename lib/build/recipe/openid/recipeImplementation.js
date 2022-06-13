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
const normalisedURLPath_1 = require("../../normalisedURLPath");
const constants_1 = require("../jwt/constants");
function getRecipeInterface(config, jwtRecipeImplementation) {
    return {
        getOpenIdDiscoveryConfiguration: function () {
            return __awaiter(this, void 0, void 0, function* () {
                let issuer = config.issuerDomain.getAsStringDangerous() + config.issuerPath.getAsStringDangerous();
                let jwks_uri =
                    config.issuerDomain.getAsStringDangerous() +
                    config.issuerPath
                        .appendPath(new normalisedURLPath_1.default(constants_1.GET_JWKS_API))
                        .getAsStringDangerous();
                return {
                    status: "OK",
                    issuer,
                    jwks_uri,
                };
            });
        },
        createJWT: function ({ payload, validitySeconds, userContext }) {
            return __awaiter(this, void 0, void 0, function* () {
                payload = payload === undefined || payload === null ? {} : payload;
                let issuer = config.issuerDomain.getAsStringDangerous() + config.issuerPath.getAsStringDangerous();
                return yield jwtRecipeImplementation.createJWT({
                    payload: Object.assign({ iss: issuer }, payload),
                    validitySeconds,
                    userContext,
                });
            });
        },
        getJWKS: function (input) {
            return __awaiter(this, void 0, void 0, function* () {
                return yield jwtRecipeImplementation.getJWKS(input);
            });
        },
    };
}
exports.default = getRecipeInterface;
