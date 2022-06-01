"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const supertokens_js_override_1 = require("supertokens-js-override");
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
