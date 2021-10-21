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
const recipeImplementation_1 = require("../../emailpassword/recipeImplementation");
const recipeImplementation_2 = require("../../thirdparty/recipeImplementation");
const utils_1 = require("../../../utils");
class RecipeImplementation {
    constructor(emailPasswordQuerier, thirdPartyQuerier) {
        this.signUp = (input) =>
            __awaiter(this, void 0, void 0, function* () {
                return yield this.emailPasswordImplementation.signUp(input);
            });
        this.signIn = (input) =>
            __awaiter(this, void 0, void 0, function* () {
                return this.emailPasswordImplementation.signIn(input);
            });
        this.signInUp = (input) =>
            __awaiter(this, void 0, void 0, function* () {
                if (this.thirdPartyImplementation === undefined) {
                    throw new Error("No thirdparty provider configured");
                }
                return this.thirdPartyImplementation.signInUp(input);
            });
        this.getUserById = (input) =>
            __awaiter(this, void 0, void 0, function* () {
                let user = yield this.emailPasswordImplementation.getUserById(input);
                if (user !== undefined) {
                    return user;
                }
                if (this.thirdPartyImplementation === undefined) {
                    return undefined;
                }
                return yield this.thirdPartyImplementation.getUserById(input);
            });
        this.getUsersByEmail = ({ email }) =>
            __awaiter(this, void 0, void 0, function* () {
                let userFromEmailPass = yield this.emailPasswordImplementation.getUserByEmail({ email });
                if (this.thirdPartyImplementation === undefined) {
                    return userFromEmailPass === undefined ? [] : [userFromEmailPass];
                }
                let thirdpartyQuerierAPIVersion = yield this.thirdPartyImplementation.querier.getAPIVersion();
                if (utils_1.maxVersion(thirdpartyQuerierAPIVersion, "2.8") !== thirdpartyQuerierAPIVersion) {
                    return userFromEmailPass === undefined ? [] : [userFromEmailPass];
                }
                let usersFromThirdParty = yield this.thirdPartyImplementation.getUsersByEmail({ email });
                if (userFromEmailPass !== undefined) {
                    return [...usersFromThirdParty, userFromEmailPass];
                }
                return usersFromThirdParty;
            });
        this.getUserByThirdPartyInfo = (input) =>
            __awaiter(this, void 0, void 0, function* () {
                if (this.thirdPartyImplementation === undefined) {
                    return undefined;
                }
                return this.thirdPartyImplementation.getUserByThirdPartyInfo(input);
            });
        this.createResetPasswordToken = (input) =>
            __awaiter(this, void 0, void 0, function* () {
                return this.emailPasswordImplementation.createResetPasswordToken(input);
            });
        this.resetPasswordUsingToken = (input) =>
            __awaiter(this, void 0, void 0, function* () {
                return this.emailPasswordImplementation.resetPasswordUsingToken(input);
            });
        this.updateEmailOrPassword = (input) =>
            __awaiter(this, void 0, void 0, function* () {
                return this.emailPasswordImplementation.updateEmailOrPassword(input);
            });
        this.emailPasswordImplementation = new recipeImplementation_1.default(emailPasswordQuerier);
        if (thirdPartyQuerier !== undefined) {
            this.thirdPartyImplementation = new recipeImplementation_2.default(thirdPartyQuerier);
        }
    }
}
exports.default = RecipeImplementation;
