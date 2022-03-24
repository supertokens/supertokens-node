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
const smtp_1 = require("../../../../emailverification/emaildelivery/services/smtp");
class SMTPService {
    constructor(config) {
        this.sendEmail = (input) =>
            __awaiter(this, void 0, void 0, function* () {
                yield this.emailVerificationSMTPService.sendEmail(input);
            });
        this.emailVerificationSMTPService = new smtp_1.default(config);
    }
}
exports.default = SMTPService;
