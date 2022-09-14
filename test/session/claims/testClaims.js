const Sinon = require("sinon");
const { BooleanClaim } = require("../../../lib/build/recipe/session/claimBaseClasses/booleanClaim");
const { PrimitiveClaim } = require("../../../lib/build/recipe/session/claimBaseClasses/primitiveClaim");

module.exports.TrueClaim = new BooleanClaim({
    key: "st-true",
    fetchValue: () => true,
});

module.exports.UndefinedClaim = new BooleanClaim({
    key: "st-undef",
    fetchValue: () => undefined,
});

module.exports.StubClaim = class StubClaim extends PrimitiveClaim {
    constructor({ key, fetchValue, fetchValueRes, id, validate, validateRes, shouldRefetch, shouldRefetchRes }) {
        super(key);
        this.fetchValue = Sinon.stub();
        if (fetchValue) {
            this.fetchValue.callsFake(fetchValue);
        } else {
            this.fetchValue.resolves(fetchValueRes);
        }

        this.validators.stub = {
            id,
        };
        if (shouldRefetch !== undefined || shouldRefetchRes !== undefined) {
            this.validators.stub.claim = this;
            if (shouldRefetch !== undefined) {
                this.validators.stub.shouldRefetch = Sinon.stub().callsFake(shouldRefetch);
            } else {
                this.validators.stub.shouldRefetch = Sinon.stub().resolves(shouldRefetchRes);
            }
        }
        if (validate) {
            this.validators.stub.validate = Sinon.stub().callsFake(validate);
        } else {
            this.validators.stub.validate = Sinon.stub().resolves(validateRes);
        }
    }
};
