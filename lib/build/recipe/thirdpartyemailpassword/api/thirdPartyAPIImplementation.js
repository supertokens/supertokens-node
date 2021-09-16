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
    const signInUpPOSTFromThirdPartyEmailPassword = apiImplmentation.signInUpPOST;
    return {
        authorisationUrlGET: apiImplmentation.authorisationUrlGET,
        signInUpPOST:
            signInUpPOSTFromThirdPartyEmailPassword === undefined
                ? undefined
                : (input) =>
                      __awaiter(this, void 0, void 0, function* () {
                          let result = yield signInUpPOSTFromThirdPartyEmailPassword({
                              type: "thirdparty",
                              code: input.code,
                              provider: input.provider,
                              redirectURI: input.redirectURI,
                              options: input.options,
                          });
                          if (result.status === "OK") {
                              if (result.user.thirdParty === undefined || result.type === "emailpassword") {
                                  throw Error("Should never come here");
                              }
                              return Object.assign(Object.assign({}, result), {
                                  user: Object.assign(Object.assign({}, result.user), {
                                      thirdParty: result.user.thirdParty,
                                  }),
                              });
                          } else if (result.status === "NO_EMAIL_GIVEN_BY_PROVIDER") {
                              return {
                                  status: "NO_EMAIL_GIVEN_BY_PROVIDER",
                              };
                          } else if (result.status === "FIELD_ERROR") {
                              return {
                                  status: "FIELD_ERROR",
                                  error: result.error,
                              };
                          } else {
                              throw Error("Should never come here");
                          }
                      }),
    };
}
exports.default = getIterfaceImpl;
