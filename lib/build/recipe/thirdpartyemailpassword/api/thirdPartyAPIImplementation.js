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
const error_1 = require("../error");
function getIterfaceImpl(apiImplmentation) {
    const signInUpPOSTFromThirdPartyEmailPassword = apiImplmentation.signInUpPOST;
    return {
        authorisationUrlGET: apiImplmentation.authorisationUrlGET,
        signOutPOST: undefined,
        signInUpPOST:
            signInUpPOSTFromThirdPartyEmailPassword === undefined
                ? undefined
                : (provider, code, redirectURI, options) =>
                      __awaiter(this, void 0, void 0, function* () {
                          let result = yield signInUpPOSTFromThirdPartyEmailPassword({
                              type: "thirdparty",
                              code,
                              provider,
                              redirectURI,
                              options,
                          });
                          if (result.user.thirdParty === undefined || result.type === "emailpassword") {
                              throw new error_1.default({
                                  type: error_1.default.GENERAL_ERROR,
                                  payload: new Error("Should never come here"),
                              });
                          }
                          return Object.assign(Object.assign({}, result), {
                              user: Object.assign(Object.assign({}, result.user), {
                                  thirdParty: result.user.thirdParty,
                              }),
                          });
                      }),
    };
}
exports.default = getIterfaceImpl;
//# sourceMappingURL=thirdPartyAPIImplementation.js.map
