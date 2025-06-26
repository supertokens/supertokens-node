"use strict";
var __importDefault =
    (this && this.__importDefault) ||
    function (mod) {
        return mod && mod.__esModule ? mod : { default: mod };
    };
Object.defineProperty(exports, "__esModule", { value: true });
exports.User = exports.LoginMethod = void 0;
const recipeUserId_1 = __importDefault(require("./recipeUserId"));
const max_1 = __importDefault(require("libphonenumber-js/max"));
class LoginMethod {
    constructor(loginMethod) {
        this.recipeId = loginMethod.recipeId;
        this.recipeUserId = new recipeUserId_1.default(loginMethod.recipeUserId);
        this.tenantIds = loginMethod.tenantIds;
        this.email = loginMethod.email;
        this.phoneNumber = loginMethod.phoneNumber;
        this.thirdParty = loginMethod.thirdParty;
        this.webauthn = loginMethod.webauthn;
        this.timeJoined = loginMethod.timeJoined;
        this.verified = loginMethod.verified;
    }
    hasSameEmailAs(email) {
        if (email === undefined) {
            return false;
        }
        // this needs to be the same as what's done in the core.
        email = email.toLowerCase().trim();
        return this.email !== undefined && this.email === email;
    }
    hasSamePhoneNumberAs(phoneNumber) {
        if (phoneNumber === undefined) {
            return false;
        }
        const parsedPhoneNumber = (0, max_1.default)(phoneNumber.trim(), { extract: false });
        if (parsedPhoneNumber === undefined) {
            // this means that the phone number is not valid according to the E.164 standard.
            // but we still just trim it.
            phoneNumber = phoneNumber.trim();
        } else {
            phoneNumber = parsedPhoneNumber.format("E.164");
        }
        return this.phoneNumber !== undefined && this.phoneNumber === phoneNumber;
    }
    hasSameThirdPartyInfoAs(thirdParty) {
        if (thirdParty === undefined) {
            return false;
        }
        thirdParty.id = thirdParty.id.trim();
        thirdParty.userId = thirdParty.userId.trim();
        return (
            this.thirdParty !== undefined &&
            this.thirdParty.id === thirdParty.id &&
            this.thirdParty.userId === thirdParty.userId
        );
    }
    hasSameWebauthnInfoAs(webauthn) {
        if (webauthn === undefined) {
            return false;
        }
        return this.webauthn !== undefined && this.webauthn.credentialIds.includes(webauthn.credentialId);
    }
    toJson() {
        return {
            recipeId: this.recipeId,
            recipeUserId: this.recipeUserId.getAsString(),
            tenantIds: this.tenantIds,
            email: this.email,
            phoneNumber: this.phoneNumber,
            thirdParty: this.thirdParty,
            webauthn: this.webauthn,
            timeJoined: this.timeJoined,
            verified: this.verified,
        };
    }
}
exports.LoginMethod = LoginMethod;
class User {
    constructor(user) {
        this.id = user.id;
        this.isPrimaryUser = user.isPrimaryUser;
        this.tenantIds = user.tenantIds;
        this.emails = user.emails;
        this.phoneNumbers = user.phoneNumbers;
        this.thirdParty = user.thirdParty;
        this.webauthn = user.webauthn;
        this.timeJoined = user.timeJoined;
        this.loginMethods = user.loginMethods.map((m) => new LoginMethod(m));
    }
    /**
     * This function is used to create a User object from the API response.
     *
     * @param apiUser - The API response from the user endpoint.
     * @returns A User object.
     */
    static fromApi(apiUser) {
        return new User(apiUser);
    }
    toJson() {
        return {
            id: this.id,
            isPrimaryUser: this.isPrimaryUser,
            tenantIds: this.tenantIds,
            emails: this.emails,
            phoneNumbers: this.phoneNumbers,
            thirdParty: this.thirdParty,
            webauthn: this.webauthn,
            loginMethods: this.loginMethods.map((m) => m.toJson()),
            timeJoined: this.timeJoined,
        };
    }
}
exports.User = User;
