"use strict";
var __importDefault =
    (this && this.__importDefault) ||
    function (mod) {
        return mod && mod.__esModule ? mod : { default: mod };
    };
Object.defineProperty(exports, "__esModule", { value: true });
const multitenancy_1 = __importDefault(require("../../../multitenancy"));
async function listAllCoreConfigProperties(_, __, ___, userContext) {
    const res = await multitenancy_1.default.listAllCoreConfigProperties(userContext);
    return res;
}
exports.default = listAllCoreConfigProperties;
