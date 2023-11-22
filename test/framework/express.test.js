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
let assert = require("assert");
const { ExpressRequest } = require("../../lib/build/framework/express/framework");
const sinon = require("sinon");

describe(`ExpressRequest`, function () {
    it("ExpressRequest.getJSONFromRequestBody should be called only once", async function () {
        const mockJSONData = { key: "value" };
        const req = new ExpressRequest({});

        const getJSONFromRequestBodyStub = sinon.stub(req, "getJSONFromRequestBody").callsFake(() => mockJSONData);

        // Call getJSONBody multiple times
        const getJsonBody = req.getJSONBody;
        const jsonData = await getJsonBody();
        const jsonData2 = await req.getJSONBody();

        sinon.assert.calledOnce(getJSONFromRequestBodyStub);

        assert(JSON.stringify(jsonData) === JSON.stringify(mockJSONData));
        assert(JSON.stringify(jsonData2) === JSON.stringify(mockJSONData));
    });

    it("ExpressRequest.getFormDataFromRequestBody should be called only once", async function () {
        const mockFormData = { key: "value" };
        const req = new ExpressRequest({});

        let getFormDataFromRequestBodyStub = sinon
            .stub(req, "getFormDataFromRequestBody")
            .callsFake(() => mockFormData);

        // Call getFormData multiple times
        const getFormData = req.getFormData;
        const formData = await getFormData();
        const formData2 = await req.getFormData();

        sinon.assert.calledOnce(getFormDataFromRequestBodyStub);

        assert(JSON.stringify(formData) === JSON.stringify(mockFormData));
        assert(JSON.stringify(formData2) === JSON.stringify(mockFormData));
    });
});
