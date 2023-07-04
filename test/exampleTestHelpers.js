/* Copyright (c) 2021, VRAI Labs and/or its affiliates. All rights reserved.
 *
 * This software is licensed under the Apache License, Version 2.0 (the
 * "License") as published by the Apache Software Foundation.
 *
 * You may not use this file except in compliance with the License. You may
 * obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
 * WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
 * License for the specific language governing permissions and limitations
 * under the License.
 */

const assert = require("assert");

/*
 * Selectors and actions helpers.
 * Using Puppeteer within shadowDom https://github.com/puppeteer/puppeteer/issues/858#issuecomment-438540596
 */
const ST_ROOT_ID = "supertokens-root";
const ST_ROOT_SELECTOR = `#${ST_ROOT_ID}`;

async function waitForSTElement(page, selector, inverted = false) {
    await page.waitForSelector(ST_ROOT_SELECTOR);
    const res = await page.waitForFunction(
        (elementSelector, rootSelector, inverted) => {
            const root = document.querySelector(rootSelector);
            if (!root || !root.shadowRoot) {
                return false;
            }
            if (elementSelector === undefined) {
                return true;
            }
            const elem = root.shadowRoot.querySelector(elementSelector);
            return inverted ? elem === null : elem;
        },
        { polling: 50 },
        selector,
        ST_ROOT_SELECTOR,
        inverted
    );
    if (res) {
        return res.asElement();
    }
    return res;
}

async function getSubmitFormButton(page) {
    return waitForSTElement(page, "[data-supertokens='button']");
}

async function getInputField(page, name) {
    return waitForSTElement(page, `input[name='${name}'`);
}

async function submitForm(page) {
    const submitButton = await getSubmitFormButton(page);
    await submitButton.click();
}

async function assertNoSTComponents(page) {
    const superTokensComponent = await page.$(ST_ROOT_SELECTOR);
    assert.strictEqual(superTokensComponent, null);
}

async function getFieldErrors(page) {
    await waitForSTElement(page);
    return await page.evaluate(
        ({ ST_ROOT_SELECTOR }) =>
            Array.from(
                document
                    .querySelector(ST_ROOT_SELECTOR)
                    .shadowRoot.querySelectorAll(
                        "[data-supertokens~='formRow'] [data-supertokens~='inputErrorMessage']"
                    ),
                (i) => i.innerText
            ),
        { ST_ROOT_SELECTOR }
    );
}

async function setInputValues(page, fields) {
    for (const field of fields) {
        await waitForSTElement(page, `input[name=${field.name}]`);

        // Reset input value.
        await page.evaluate(
            ({ field, ST_ROOT_SELECTOR }) => {
                const inputNode = document
                    .querySelector(ST_ROOT_SELECTOR)
                    .shadowRoot.querySelector(`input[name=${field.name}]`);
                inputNode.value = "";
            },
            { field, ST_ROOT_SELECTOR }
        );

        // Type new value.
        const passwordInput = await getInputField(page, field.name);
        await passwordInput.type(field.value);

        // Blur.
        await page.evaluate(
            ({ field, ST_ROOT_SELECTOR }) => {
                const inputNode = document
                    .querySelector(ST_ROOT_SELECTOR)
                    .shadowRoot.querySelector(`input[name=${field.name}]`);
                inputNode.blur();
            },
            { field, ST_ROOT_SELECTOR }
        );
    }

    // Make sure to wait for success feedbacks.
    return await new Promise((r) => setTimeout(r, 300));
}

function getTestEmail() {
    return `john.doe+${Date.now()}@supertokens.io`;
}

async function getSignInOrSignUpSwitchLink(page) {
    return waitForSTElement(page, "[data-supertokens~='link']");
}

async function toggleSignInSignUp(page) {
    // Click on Sign Up.
    const signUpLink = await getSignInOrSignUpSwitchLink(page);
    await signUpLink.click();
}

module.exports = {
    waitForSTElement,
    getSubmitFormButton,
    getInputField,
    submitForm,
    assertNoSTComponents,
    getFieldErrors,
    setInputValues,
    getTestEmail,
    getSignInOrSignUpSwitchLink,
    toggleSignInSignUp,
};
