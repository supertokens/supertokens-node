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
exports.AllowedDomainsClaim = exports.AllowedDomainsClaimClass = void 0;
const claims_1 = require("../session/claims");
const recipe_1 = __importDefault(require("./recipe"));
/**
 * We include "Class" in the class name, because it makes it easier to import the right thing (the instance) instead of this.
 * */
class AllowedDomainsClaimClass extends claims_1.PrimitiveArrayClaim {
    constructor() {
        super({
            key: "st-t-dmns",
            fetchValue(_, tenantId, userContext) {
                return __awaiter(this, void 0, void 0, function* () {
                    const recipe = recipe_1.default.getInstanceOrThrowError();
                    if (recipe.getAllowedDomainsForTenantId === undefined) {
                        return undefined; // User did not provide a function to get allowed domains, but is using a validator. So we don't allow any domains by default
                    }
                    return yield recipe.getAllowedDomainsForTenantId(tenantId, userContext);
                });
            },
            defaultMaxAgeInSeconds: 3600,
        });
    }
    getValueFromPayload(payload, _userContext) {
        var _a;
        const res = (_a = payload[this.key]) === null || _a === void 0 ? void 0 : _a.v;
        if (res === undefined) {
            return [];
        }
        return res;
    }
    getLastRefetchTime(payload, _userContext) {
        var _a;
        const res = (_a = payload[this.key]) === null || _a === void 0 ? void 0 : _a.t;
        if (res === undefined) {
            return Date.now();
        }
        return res;
    }
}
exports.AllowedDomainsClaimClass = AllowedDomainsClaimClass;
exports.AllowedDomainsClaim = new AllowedDomainsClaimClass();
