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
    var _a, _b, _c;
    const signInUpPOSTFromThirdPartyEmailPassword =
        (_a = apiImplmentation.thirdPartySignInUpPOST) === null || _a === void 0 ? void 0 : _a.bind(apiImplmentation);
    return {
        authorisationUrlGET:
            (_b = apiImplmentation.authorisationUrlGET) === null || _b === void 0 ? void 0 : _b.bind(apiImplmentation),
        appleRedirectHandlerPOST:
            (_c = apiImplmentation.appleRedirectHandlerPOST) === null || _c === void 0
                ? void 0
                : _c.bind(apiImplmentation),
        signInUpPOST:
            signInUpPOSTFromThirdPartyEmailPassword === undefined
                ? undefined
                : function (input) {
                      return __awaiter(this, void 0, void 0, function* () {
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
                      });
                  },
    };
}
exports.default = getIterfaceImpl;
