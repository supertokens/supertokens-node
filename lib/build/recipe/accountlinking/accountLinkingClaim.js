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
var __importDefault =
    (this && this.__importDefault) ||
    function (mod) {
        return mod && mod.__esModule ? mod : { default: mod };
    };
Object.defineProperty(exports, "__esModule", { value: true });
exports.AccountLinkingClaim = exports.AccountLinkingClaimClass = void 0;
const claims_1 = require("../session/claims");
const _1 = __importDefault(require("./"));
const recipeUserId_1 = __importDefault(require("../../recipeUserId"));
class AccountLinkingClaimClass extends claims_1.PrimitiveClaim {
    constructor() {
        super({
            key: "st-linking",
            fetchValue(_, __, ___) {
                // We return undefined here cause we have no way of knowing which recipeId
                // this primary user will need to be linked with. We know this value only
                // when we want to set this claim in the actual API, and we can use
                // session.setClaimValue(..) for that.
                return undefined;
            },
        });
        // this is a utility function which should be used for this claim instead of the get claim
        // value cause this checks with the db before returning the value, and we always want an
        // up to date value.
        this.resyncAndGetValue = (session, userContext) =>
            __awaiter(this, void 0, void 0, function* () {
                let fromSession = yield session.getClaimValue(exports.AccountLinkingClaim, userContext);
                if (fromSession === undefined) {
                    return undefined;
                }
                let primaryUserToLinkTo = yield _1.default.fetchFromAccountToLinkTable(
                    new recipeUserId_1.default(fromSession),
                    userContext
                );
                if (primaryUserToLinkTo === undefined || primaryUserToLinkTo !== session.getUserId()) {
                    // this means that this session has stale data about which account to
                    // link to. So we remove the claim
                    yield session.removeClaim(exports.AccountLinkingClaim);
                    return undefined;
                }
                // we return the actual value from the claim since we know it is up to date with the db.
                return fromSession;
            });
    }
}
exports.AccountLinkingClaimClass = AccountLinkingClaimClass;
exports.AccountLinkingClaim = new AccountLinkingClaimClass();
