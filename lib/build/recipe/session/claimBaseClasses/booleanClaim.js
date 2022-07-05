"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const primitiveClaim_1 = require("./primitiveClaim");
class BooleanClaim extends primitiveClaim_1.PrimitiveClaim {
    constructor(conf) {
        super(conf);
        this.validators = Object.assign(Object.assign({}, this.validators), {
            isTrue: (maxAge) => {
                if (maxAge) {
                    return this.validators.hasFreshValue(true, maxAge);
                }
                return this.validators.hasValue(true);
            },
            isFalse: (maxAge) => {
                if (maxAge) {
                    return this.validators.hasFreshValue(false, maxAge);
                }
                return this.validators.hasValue(false);
            },
        });
    }
}
exports.BooleanClaim = BooleanClaim;
