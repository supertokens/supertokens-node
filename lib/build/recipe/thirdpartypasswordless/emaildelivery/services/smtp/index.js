"use strict";
var __importDefault =
    (this && this.__importDefault) ||
    function (mod) {
        return mod && mod.__esModule ? mod : { default: mod };
    };
Object.defineProperty(exports, "__esModule", { value: true });
const nodemailer_1 = require("nodemailer");
const supertokens_js_override_1 = __importDefault(require("supertokens-js-override"));
const serviceImplementation_1 = require("./serviceImplementation");
const smtp_1 = __importDefault(require("../../../../passwordless/emaildelivery/services/smtp"));
const passwordlessServiceImplementation_1 = __importDefault(
    require("./serviceImplementation/passwordlessServiceImplementation")
);
class SMTPService {
    constructor(config) {
        this.sendEmail = async (input) => {
            return await this.passwordlessSMTPService.sendEmail(input);
        };
        const transporter = nodemailer_1.createTransport({
            host: config.smtpSettings.host,
            port: config.smtpSettings.port,
            auth: {
                user: config.smtpSettings.authUsername || config.smtpSettings.from.email,
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
        this.passwordlessSMTPService = new smtp_1.default({
            smtpSettings: config.smtpSettings,
            override: (_) => {
                return passwordlessServiceImplementation_1.default(this.serviceImpl);
            },
        });
    }
}
exports.default = SMTPService;
