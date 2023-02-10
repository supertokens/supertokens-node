"use strict";
var __importDefault =
    (this && this.__importDefault) ||
    function (mod) {
        return mod && mod.__esModule ? mod : { default: mod };
    };
Object.defineProperty(exports, "__esModule", { value: true });
const supertokens_js_override_1 = __importDefault(require("supertokens-js-override"));
class SmsDelivery {
    constructor(config) {
        let builder = new supertokens_js_override_1.default(config.service);
        if (config.override !== undefined) {
            builder = builder.override(config.override);
        }
        this.ingredientInterfaceImpl = builder.build();
    }
}
exports.default = SmsDelivery;
