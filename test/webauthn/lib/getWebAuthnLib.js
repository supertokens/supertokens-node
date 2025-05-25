const { readFile } = require("fs/promises");

require("./wasm_exec");

const getWebauthnLib = async () => {
    const wasmBuffer = await readFile(__dirname + "/webauthn.wasm");

    // Set up the WebAssembly module instance
    const go = new Go();
    const { instance } = await WebAssembly.instantiate(wasmBuffer, go.importObject);
    go.run(instance);

    // Export extractURL from the global object
    const createCredential = (
        registerOptions,
        { userNotPresent = true, userNotVerified = true, rpId, rpName, origin }
    ) => {
        const registerOptionsString = JSON.stringify(registerOptions);
        const result = global.createCredential(
            registerOptionsString,
            rpId,
            rpName,
            origin,
            userNotPresent,
            userNotVerified
        );

        if (!result) {
            throw new Error("Failed to create credential");
        }

        try {
            const credential = JSON.parse(result);
            return credential;
        } catch (e) {
            throw new Error("Failed to parse credential");
        }
    };

    const createAndAssertCredential = (
        registerOptions,
        signInOptions,
        { userNotPresent = false, userNotVerified = false, rpId, rpName, origin }
    ) => {
        const registerOptionsString = JSON.stringify(registerOptions);
        const signInOptionsString = JSON.stringify(signInOptions);

        const result = global.createAndAssertCredential(
            registerOptionsString,
            signInOptionsString,
            rpId,
            rpName,
            origin,
            userNotPresent,
            userNotVerified
        );

        if (!result) {
            throw new Error("Failed to create/assert credential");
        }

        try {
            const parsedResult = JSON.parse(result);
            return { attestation: parsedResult.attestation, assertion: parsedResult.assertion };
        } catch (e) {
            throw new Error("Failed to parse result");
        }
    };

    return { createCredential, createAndAssertCredential };
};

module.exports = getWebauthnLib;
