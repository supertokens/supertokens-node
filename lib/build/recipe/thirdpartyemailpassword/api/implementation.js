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
const implementation_1 = require("../../emailpassword/api/implementation");
const implementation_2 = require("../../thirdparty/api/implementation");
class APIImplementation {
    constructor() {
        this.emailExistsGET = (input) =>
            __awaiter(this, void 0, void 0, function* () {
                return this.emailPasswordImplementation.emailExistsGET(input);
            });
        this.generatePasswordResetTokenPOST = (input) =>
            __awaiter(this, void 0, void 0, function* () {
                return this.emailPasswordImplementation.generatePasswordResetTokenPOST(input);
            });
        this.passwordResetPOST = (input) =>
            __awaiter(this, void 0, void 0, function* () {
                return this.emailPasswordImplementation.passwordResetPOST(input);
            });
        this.authorisationUrlGET = (input) =>
            __awaiter(this, void 0, void 0, function* () {
                return this.thirdPartyImplementation.authorisationUrlGET(input);
            });
        this.emailPasswordSignInPOST = (input) =>
            __awaiter(this, void 0, void 0, function* () {
                return this.emailPasswordImplementation.signInPOST(input);
            });
        this.emailPasswordSignUpPOST = (input) =>
            __awaiter(this, void 0, void 0, function* () {
                return this.emailPasswordImplementation.signUpPOST(input);
            });
        this.thirdPartySignInUpPOST = (input) =>
            __awaiter(this, void 0, void 0, function* () {
                return this.thirdPartyImplementation.signInUpPOST(input);
            });
        this.emailPasswordImplementation = new implementation_1.default();
        this.thirdPartyImplementation = new implementation_2.default();
    }
}
exports.default = APIImplementation;
