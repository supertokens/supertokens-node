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

import assert from 'assert'
import { humaniseMilliseconds } from 'supertokens-node/utils'
import { describe, it } from 'vitest'
import { printPath } from './utils'

describe(`Humanise: ${printPath('[test/humanise.test.js]')}`, () => {
  it('test humanise milliseconds', () => {
    assert(humaniseMilliseconds(1000) === '1 second')
    assert(humaniseMilliseconds(59000) === '59 seconds')
    assert(humaniseMilliseconds(60000) === '1 minute')
    assert(humaniseMilliseconds(119000) === '1 minute')
    assert(humaniseMilliseconds(120000) === '2 minutes')
    assert(humaniseMilliseconds(3600000) === '1 hour')
    assert(humaniseMilliseconds(3660000) === '1 hour')
    assert(humaniseMilliseconds(3960000) === '1.1 hours')
    assert(humaniseMilliseconds(7260000) === '2 hours')
    assert(humaniseMilliseconds(18000000) === '5 hours')
  })
})
