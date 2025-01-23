"use strict";
var __importDefault =
    (this && this.__importDefault) ||
    function (mod) {
        return mod && mod.__esModule ? mod : { default: mod };
    };
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifySession = verifySession;
const framework_1 = require("../../../framework/awsLambda/framework");
const supertokens_1 = __importDefault(require("../../../supertokens"));
const recipe_1 = __importDefault(require("../recipe"));
const utils_1 = require("../../../utils");
function verifySession(handler, verifySessionOptions) {
    return async (event, context, callback) => {
        let supertokens = supertokens_1.default.getInstanceOrThrowError();
        let request = new framework_1.AWSRequest(event);
        let response = new framework_1.AWSResponse(event);
        const userContext = (0, utils_1.makeDefaultUserContextFromAPI)(request);
        try {
            let sessionRecipe = recipe_1.default.getInstanceOrThrowError();
            event.session = await sessionRecipe.verifySession(verifySessionOptions, request, response, userContext);
            let handlerResult = await handler(event, context, callback);
            return response.sendResponse(handlerResult);
        } catch (err) {
            await supertokens.errorHandler(err, request, response, userContext);
            if (response.responseSet) {
                return response.sendResponse({});
            }
            throw err;
        }
    };
}
