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
const recipe_1 = require("./recipe");
const primitiveArrayClaim_1 = require("../session/claimBaseClasses/primitiveArrayClaim");
/**
 * We include "Class" in the class name, because it makes it easier to import the right thing (the instance) instead of this.
 * */
class UserRoleClaimClass extends primitiveArrayClaim_1.PrimitiveArrayClaim {
    constructor() {
        super({
            key: "st-role",
            fetchValue(userId, userContext) {
                return __awaiter(this, void 0, void 0, function* () {
                    const recipe = recipe_1.default.getInstanceOrThrowError();
                    const res = yield recipe.recipeInterfaceImpl.getRolesForUser({
                        userId,
                        userContext,
                    });
                    return res.roles;
                });
            },
            defaultMaxAgeInSeconds: 300,
        });
    }
}
exports.UserRoleClaimClass = UserRoleClaimClass;
exports.UserRoleClaim = new UserRoleClaimClass();
