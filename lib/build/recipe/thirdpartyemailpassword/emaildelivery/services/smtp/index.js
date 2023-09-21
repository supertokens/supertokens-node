"use strict";
var __importDefault =
    (this && this.__importDefault) ||
    function (mod) {
        return mod && mod.__esModule ? mod : { default: mod };
    };
Object.defineProperty(exports, "__esModule", { value: true });
const smtp_1 = __importDefault(require("../../../../emailpassword/emaildelivery/services/smtp"));
class SMTPService {
    constructor(config) {
        this.sendEmail = async (input) => {
            await this.emailPasswordSMTPService.sendEmail(input);
        };
        this.emailPasswordSMTPService = new smtp_1.default(config);
    }
}
exports.default = SMTPService;
