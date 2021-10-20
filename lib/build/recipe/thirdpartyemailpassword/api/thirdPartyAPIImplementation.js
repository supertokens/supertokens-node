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
function getIterfaceImpl(apiImplmentation) {
    const signInUpPOSTFromThirdPartyEmailPassword = apiImplmentation.thirdPartySignInUpPOST;
    return {
        authorisationUrlGET: apiImplmentation.authorisationUrlGET,
        signInUpPOST:
            signInUpPOSTFromThirdPartyEmailPassword === undefined
                ? undefined
                : (input) =>
                      __awaiter(this, void 0, void 0, function* () {
                          let result = yield signInUpPOSTFromThirdPartyEmailPassword(input);
                          if (result.status === "OK") {
                              if (result.user.thirdParty === undefined) {
                                  throw new Error("Should never come here");
                              }
                              return Object.assign(Object.assign({}, result), {
                                  user: Object.assign(Object.assign({}, result.user), {
                                      thirdParty: Object.assign({}, result.user.thirdParty),
                                  }),
                              });
                          }
                          return result;
                      }),
    };
}
exports.default = getIterfaceImpl;
