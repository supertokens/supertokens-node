import assert from 'assert'

import STExpress from 'supertokens-node'
import JWTRecipe from 'supertokens-node/recipe/jwt'
import { ProcessState } from 'supertokens-node/processState'
import { Querier } from 'supertokens-node/querier'
import { maxVersion } from 'supertokens-node/utils'
import { afterAll, beforeEach, describe, it } from 'vitest'
import { cleanST, killAllST, printPath, setupST, startST } from '../utils'

describe(`createJWTFeature: ${printPath('[test/jwt/createJWTFeature.test.js]')}`, () => {
  beforeEach(async () => {
    await killAllST()
    await setupST()
    ProcessState.getInstance().reset()
  })

  afterAll(async () => {
    await killAllST()
    await cleanST()
  })

  it('Test that sending 0 validity throws an error', async () => {
    await startST()
    STExpress.init({
      supertokens: {
        connectionURI: 'http://localhost:8080',
      },
      appInfo: {
        apiDomain: 'api.supertokens.io',
        appName: 'SuperTokens',
        websiteDomain: 'supertokens.io',
      },
      recipeList: [JWTRecipe.init()],
    })

    // Only run for version >= 2.9
    const querier = Querier.getNewInstanceOrThrowError(undefined)
    const apiVersion = await querier.getAPIVersion()
    if (maxVersion(apiVersion, '2.8') === '2.8')
      return

    try {
      await JWTRecipe.createJWT({}, 0)
      assert.fail()
    }
    catch (ignored) {
      // TODO (During Review): Should we check for the error message?
    }
  })

  it('Test that sending a invalid json throws an error', async () => {
    await startST()
    STExpress.init({
      supertokens: {
        connectionURI: 'http://localhost:8080',
      },
      appInfo: {
        apiDomain: 'api.supertokens.io',
        appName: 'SuperTokens',
        websiteDomain: 'supertokens.io',
      },
      recipeList: [JWTRecipe.init()],
    })

    // Only run for version >= 2.9
    const querier = Querier.getNewInstanceOrThrowError(undefined)
    const apiVersion = await querier.getAPIVersion()
    if (maxVersion(apiVersion, '2.8') === '2.8')
      return

    let jwt

    try {
      jwt = await JWTRecipe.createJWT('invalidjson', 1000)
    }
    catch (err) {
      // TODO (During Review): Should we check for the error message?
    }

    assert(jwt === undefined)
  })

  it('Test that returned JWT uses 100 years for expiry for default config', async () => {
    await startST()
    STExpress.init({
      supertokens: {
        connectionURI: 'http://localhost:8080',
      },
      appInfo: {
        apiDomain: 'api.supertokens.io',
        appName: 'SuperTokens',
        websiteDomain: 'supertokens.io',
      },
      recipeList: [JWTRecipe.init()],
    })

    // Only run for version >= 2.9
    const querier = Querier.getNewInstanceOrThrowError(undefined)
    const apiVersion = await querier.getAPIVersion()
    if (maxVersion(apiVersion, '2.8') === '2.8')
      return

    const currentTimeInSeconds = Date.now() / 1000
    const jwt = (await JWTRecipe.createJWT({})).jwt.split('.')[1]
    const decodedJWTPayload = Buffer.from(jwt, 'base64').toString('utf-8')

    const targetExpiryDuration = 3153600000 // 100 years in seconds
    const jwtExpiry = JSON.parse(decodedJWTPayload).exp
    const actualExpiry = jwtExpiry - currentTimeInSeconds

    const differenceInExpiryDurations = Math.abs(actualExpiry - targetExpiryDuration)

    // Both expiry durations should be within 5 seconds of each other. Using 5 seconds as a worst case buffer
    assert(differenceInExpiryDurations < 5)
  })

  it('Test that jwt validity is same as validity set in config', async () => {
    await startST()
    STExpress.init({
      supertokens: {
        connectionURI: 'http://localhost:8080',
      },
      appInfo: {
        apiDomain: 'api.supertokens.io',
        appName: 'SuperTokens',
        websiteDomain: 'supertokens.io',
      },
      recipeList: [
        JWTRecipe.init({
          jwtValiditySeconds: 1000,
        }),
      ],
    })

    // Only run for version >= 2.9
    const querier = Querier.getNewInstanceOrThrowError(undefined)
    const apiVersion = await querier.getAPIVersion()
    if (maxVersion(apiVersion, '2.8') === '2.8')
      return

    const currentTimeInSeconds = Date.now() / 1000
    const jwt = (await JWTRecipe.createJWT({})).jwt.split('.')[1]
    const decodedJWTPayload = Buffer.from(jwt, 'base64').toString('utf-8')

    const targetExpiryDuration = 1000 // 100 years in seconds
    const jwtExpiry = JSON.parse(decodedJWTPayload).exp
    const actualExpiry = jwtExpiry - currentTimeInSeconds

    const differenceInExpiryDurations = Math.abs(actualExpiry - targetExpiryDuration)

    // Both expiry durations should be within 5 seconds of each other. Using 5 seconds as a worst case buffer
    assert(differenceInExpiryDurations < 5)
  })

  it('Test that jwt validity is same as validity passed in createJWT function', async () => {
    await startST()
    STExpress.init({
      supertokens: {
        connectionURI: 'http://localhost:8080',
      },
      appInfo: {
        apiDomain: 'api.supertokens.io',
        appName: 'SuperTokens',
        websiteDomain: 'supertokens.io',
      },
      recipeList: [
        JWTRecipe.init({
          jwtValiditySeconds: 1000,
        }),
      ],
    })

    // Only run for version >= 2.9
    const querier = Querier.getNewInstanceOrThrowError(undefined)
    const apiVersion = await querier.getAPIVersion()
    if (maxVersion(apiVersion, '2.8') === '2.8')
      return

    const currentTimeInSeconds = Date.now() / 1000
    const targetExpiryDuration = 500 // 100 years in seconds

    const jwt = (await JWTRecipe.createJWT({}, targetExpiryDuration)).jwt.split('.')[1]
    const decodedJWTPayload = Buffer.from(jwt, 'base64').toString('utf-8')

    const jwtExpiry = JSON.parse(decodedJWTPayload).exp
    const actualExpiry = jwtExpiry - currentTimeInSeconds

    const differenceInExpiryDurations = Math.abs(actualExpiry - targetExpiryDuration)

    // Both expiry durations should be within 5 seconds of each other. Using 5 seconds as a worst case buffer
    assert(differenceInExpiryDurations < 5)
  })
})
