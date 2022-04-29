"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const recipe_1 = require("../recipe");
const framework_1 = require("../../../framework/h3/framework");
const supertokens_1 = require("../../../supertokens");
function verifySession(options) {
    return (req, res, next) => __awaiter(this, void 0, void 0, function* () {
        const request = new framework_1.H3Request(req);
        const response = new framework_1.H3ResponseTokens(res);
        try {
            const sessionRecipe = recipe_1.default.getInstanceOrThrowError();
            req.session = yield sessionRecipe.verifySession(options, request, response);
            next();
        }
        catch (err) {
            try {
                const supertokens = supertokens_1.default.getInstanceOrThrowError();
                yield supertokens.errorHandler(err, request, response);
            }
            catch (err) {
                next(err);
            }
        }
    });
}
exports.verifySession = verifySession;
