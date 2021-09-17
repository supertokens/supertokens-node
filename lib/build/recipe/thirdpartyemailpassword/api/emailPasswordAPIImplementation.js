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
    const signInUpPOST = apiImplmentation.signInUpPOST;
    return {
        emailExistsGET: apiImplmentation.emailExistsGET,
        generatePasswordResetTokenPOST: apiImplmentation.generatePasswordResetTokenPOST,
        passwordResetPOST: apiImplmentation.passwordResetPOST,
        signInPOST:
            signInUpPOST === undefined
                ? undefined
                : (input) =>
                      __awaiter(this, void 0, void 0, function* () {
                          let response = yield signInUpPOST({
                              type: "emailpassword",
                              formFields: input.formFields,
                              options: input.options,
                              isSignIn: true,
                          });
                          if (response.status === "OK") {
                              return {
                                  status: "OK",
                                  user: response.user,
                              };
                          } else if (response.status === "WRONG_CREDENTIALS_ERROR") {
                              return {
                                  status: "WRONG_CREDENTIALS_ERROR",
                              };
                          } else {
                              throw Error("Should never come here");
                          }
                      }),
        signUpPOST:
            signInUpPOST === undefined
                ? undefined
                : (input) =>
                      __awaiter(this, void 0, void 0, function* () {
                          let response = yield signInUpPOST({
                              type: "emailpassword",
                              formFields: input.formFields,
                              options: input.options,
                              isSignIn: false,
                          });
                          if (response.status === "OK") {
                              return {
                                  status: "OK",
                                  user: response.user,
                              };
                          } else if (response.status === "EMAIL_ALREADY_EXISTS_ERROR") {
                              return {
                                  status: "EMAIL_ALREADY_EXISTS_ERROR",
                              };
                          } else {
                              throw Error("Should never come here");
                          }
                      }),
    };
}
exports.default = getIterfaceImpl;
