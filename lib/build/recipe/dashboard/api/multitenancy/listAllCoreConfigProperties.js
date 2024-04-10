"use strict";
var __importDefault =
    (this && this.__importDefault) ||
    function (mod) {
        return mod && mod.__esModule ? mod : { default: mod };
    };
Object.defineProperty(exports, "__esModule", { value: true });
const supertokens_1 = __importDefault(require("../../../../supertokens"));
async function listAllCoreConfigProperties(_, tenantId, ___, userContext) {
    const res = await supertokens_1.default
        .getInstanceOrThrowError()
        .listAllCoreConfigProperties({ tenantId, userContext });
    return res;
}
exports.default = listAllCoreConfigProperties;
