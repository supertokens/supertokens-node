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
const serviceImplementation_1 = require("./serviceImplementation");
const smtp_1 = require("../../../../emailverification/emaildelivery/services/smtp");
const emailVerificationServiceImplementation_1 = require("./serviceImplementation/emailVerificationServiceImplementation");
class SMTPService {
    constructor(config) {
        this.sendEmail = (input) =>
            __awaiter(this, void 0, void 0, function* () {
                if (input.type === "EMAIL_VERIFICATION") {
                    return this.emailVerificationSMTPService.sendEmail(input);
                }
                let content = yield this.serviceImpl.getContent(input);
                yield this.serviceImpl.sendRawEmail(
                    Object.assign(Object.assign({}, content), { userContext: input.userContext })
                );
            });
        const transporter = nodemailer_1.createTransport({
            host: config.smtpSettings.host,
            port: config.smtpSettings.port,
            auth: {
                user: config.smtpSettings.from.email,
                pass: config.smtpSettings.password,
            },
            secure: config.smtpSettings.secure,
        });
        let builder = new supertokens_js_override_1.default(
            serviceImplementation_1.getServiceImplementation(transporter, config.smtpSettings.from)
        );
        if (config.override !== undefined) {
            builder = builder.override(config.override);
        }
        this.serviceImpl = builder.build();
        this.emailVerificationSMTPService = new smtp_1.default({
            smtpSettings: config.smtpSettings,
            override: (_) => {
                return emailVerificationServiceImplementation_1.default(this.serviceImpl);
            },
        });
    }
}
exports.default = SMTPService;
