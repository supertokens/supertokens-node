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
class SMTPService {
    constructor(config) {
        this.sendEmail = async (input) => {
            let content = await this.serviceImpl.getContent(input);
            await this.serviceImpl.sendRawEmail(
                Object.assign(Object.assign({}, content), { userContext: input.userContext })
            );
        };
        const transporter = (0, nodemailer_1.createTransport)({
            host: config.smtpSettings.host,
            port: config.smtpSettings.port,
            auth: {
                user: config.smtpSettings.authUsername || config.smtpSettings.from.email,
                pass: config.smtpSettings.password,
            },
            secure: config.smtpSettings.secure,
        });
        let builder = new supertokens_js_override_1.default(
            (0, serviceImplementation_1.getServiceImplementation)(transporter, config.smtpSettings.from)
        );
        if (config.override !== undefined) {
            builder = builder.override(config.override);
        }
        this.serviceImpl = builder.build();
    }
}
exports.default = SMTPService;
