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
const framework_1 = require("../../../framework/awsLambda/framework");
const supertokens_1 = require("../../../supertokens");
const recipe_1 = require("../recipe");
function verifySession(handler, verifySessionOptions) {
    return (event, context, callback) =>
        __awaiter(this, void 0, void 0, function* () {
            let supertokens = supertokens_1.default.getInstanceOrThrowError();
            let request = new framework_1.AWSRequest(event);
            let response = new framework_1.AWSResponse(event);
            try {
                let sessionRecipe = recipe_1.default.getInstanceOrThrowError();
                event.session = yield sessionRecipe.verifySession(verifySessionOptions, request, response);
                let handlerResult = yield handler(event, context, callback);
                return response.sendResponse(handlerResult);
            } catch (err) {
                yield supertokens.errorHandler(err, request, response);
                if (response.responseSet) {
                    return response.sendResponse({});
                }
                throw err;
            }
        });
}
exports.verifySession = verifySession;
