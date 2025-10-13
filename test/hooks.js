const { resetAll } = require("./utils");

exports.mochaHooks = {
    beforeEach() {
        resetAll();
    },
    afterEach() {
        resetAll();
    },
};
