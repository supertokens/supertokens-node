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
const normalisedURLPath_1 = __importDefault(require("../../normalisedURLPath"));
const configUtils_1 = require("./providers/configUtils");
const recipe_1 = __importDefault(require("../multitenancy/recipe"));
function getRecipeImplementation(querier, providers) {
    return {
        signInUp: function ({ thirdPartyId, thirdPartyUserId, email, oAuthTokens, rawUserInfoFromProvider, tenantId }) {
            return __awaiter(this, void 0, void 0, function* () {
                let response = yield querier.sendPostRequest(
                    new normalisedURLPath_1.default(`/${tenantId}/recipe/signinup`),
                    {
                        thirdPartyId,
                        thirdPartyUserId,
                        email: { id: email },
                    }
                );
                return {
                    status: "OK",
                    createdNewUser: response.createdNewUser,
                    user: response.user,
                    oAuthTokens,
                    rawUserInfoFromProvider,
                };
            });
        },
        manuallyCreateOrUpdateUser: function ({ thirdPartyId, thirdPartyUserId, email, tenantId }) {
            return __awaiter(this, void 0, void 0, function* () {
                let response = yield querier.sendPostRequest(
                    new normalisedURLPath_1.default(`/${tenantId}/recipe/signinup`),
                    {
                        thirdPartyId,
                        thirdPartyUserId,
                        email: { id: email },
                    }
                );
                return {
                    status: "OK",
                    createdNewUser: response.createdNewUser,
                    user: response.user,
                };
            });
        },
        getUserById: function ({ userId }) {
            return __awaiter(this, void 0, void 0, function* () {
                let response = yield querier.sendGetRequest(new normalisedURLPath_1.default("/recipe/user"), {
                    userId,
                });
                if (response.status === "OK") {
                    return response.user;
                } else {
                    return undefined;
                }
            });
        },
        getUsersByEmail: function ({ email, tenantId }) {
            return __awaiter(this, void 0, void 0, function* () {
                let users = [];
                users = (yield querier.sendGetRequest(
                    new normalisedURLPath_1.default(`/${tenantId}/recipe/users/by-email`),
                    {
                        email,
                    }
                )).users;
                return users;
            });
        },
        getUserByThirdPartyInfo: function ({ thirdPartyId, thirdPartyUserId, tenantId }) {
            return __awaiter(this, void 0, void 0, function* () {
                let response = yield querier.sendGetRequest(
                    new normalisedURLPath_1.default(`/${tenantId}/recipe/user`),
                    {
                        thirdPartyId,
                        thirdPartyUserId,
                    }
                );
                if (response.status === "OK") {
                    return response.user;
                } else {
                    return undefined;
                }
            });
        },
        getProvider: function ({ thirdPartyId, tenantId, clientType, userContext }) {
            return __awaiter(this, void 0, void 0, function* () {
                const mtRecipe = recipe_1.default.getInstanceOrThrowError();
                const tenantConfig = yield mtRecipe.recipeInterfaceImpl.getTenant({ tenantId, userContext });
                if (tenantConfig === undefined) {
                    throw new Error("Tenant not found");
                }
                const mergedProviders = configUtils_1.mergeProvidersFromCoreAndStatic(
                    tenantConfig.thirdParty.providers,
                    providers
                );
                const provider = yield configUtils_1.findAndCreateProviderInstance(
                    mergedProviders,
                    thirdPartyId,
                    clientType,
                    userContext
                );
                return provider;
            });
        },
    };
}
exports.default = getRecipeImplementation;
