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
const supertokens_js_override_1 = require("supertokens-js-override");
class EmailDelivery {
    constructor(config) {
        let defaultIngredientImpl = {
            sendEmail: function (input) {
                return __awaiter(this, void 0, void 0, function* () {
                    return config.service.sendEmail(input);
                });
            },
        };
        let builder = new supertokens_js_override_1.default(defaultIngredientImpl);
        if (config.override !== undefined) {
            builder = builder.override(config.override);
        }
        this.ingredientInterfaceImpl = builder.build();
    }
}
exports.default = EmailDelivery;
