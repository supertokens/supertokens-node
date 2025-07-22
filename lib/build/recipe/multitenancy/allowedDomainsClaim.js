"use strict";
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
            async fetchValue(_userId, _recipeUserId, tenantId, _currentPayload, userContext) {
                const recipe = recipe_1.default.getInstanceOrThrowError();
                if (recipe.getAllowedDomainsForTenantId === undefined) {
                    return undefined; // User did not provide a function to get allowed domains, but is using a validator. So we don't allow any domains by default
                }
                return await recipe.getAllowedDomainsForTenantId(tenantId, userContext);
            },
        });
    }
}
exports.AllowedDomainsClaimClass = AllowedDomainsClaimClass;
exports.AllowedDomainsClaim = new AllowedDomainsClaimClass();
