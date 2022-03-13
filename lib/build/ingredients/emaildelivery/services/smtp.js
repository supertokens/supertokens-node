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
const nodemailer_1 = require("nodemailer");
const supertokens_js_override_1 = require("supertokens-js-override");
function getEmailServiceImplementation(config, getDefaultEmailServiceImplementation) {
    const transporter = nodemailer_1.createTransport({
        host: config.smtpSettings.host,
        port: config.smtpSettings.port,
        auth: config.smtpSettings.auth,
        secure: config.smtpSettings.secure,
    });
    let builder = new supertokens_js_override_1.default(
        getDefaultEmailServiceImplementation(transporter, config.smtpSettings.from)
    );
    if (config.override !== undefined) {
        builder = builder.override(config.override);
    }
    let serviceImpl = builder.build();
    return {
        sendEmail: function (input) {
            return __awaiter(this, void 0, void 0, function* () {
                let content = yield serviceImpl.getContent(input);
                yield serviceImpl.sendRawEmail(Object.assign(Object.assign({}, content), input.userContext));
            });
        },
    };
}
exports.getEmailServiceImplementation = getEmailServiceImplementation;
