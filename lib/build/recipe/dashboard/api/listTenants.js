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
const multitenancy_1 = __importDefault(require("../../multitenancy"));
function listTenants(_, __, ___, userContext) {
    return __awaiter(this, void 0, void 0, function* () {
        let tenantsRes = yield multitenancy_1.default.listAllTenants(userContext);
        let finalTenants = [];
        if (tenantsRes.status !== "OK") {
            return tenantsRes;
        }
        for (let i = 0; i < tenantsRes.tenants.length; i++) {
            let currentTenant = tenantsRes.tenants[i];
            let modifiedTenant = {
                tenantId: currentTenant.tenantId,
                emailPassword: currentTenant.emailPassword,
                passwordless: currentTenant.passwordless,
                thirdParty: currentTenant.thirdParty,
            };
            finalTenants.push(modifiedTenant);
        }
        return {
            status: "OK",
            tenants: finalTenants,
        };
    });
}
exports.default = listTenants;
