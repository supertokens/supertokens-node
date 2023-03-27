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

import { exec } from 'node:child_process'
import fs from 'fs'
import { join } from 'node:path'
import nock from 'nock'
import request from 'supertest'
import SuperTokens from 'supertokens-node/supertokens'
import SessionRecipe from 'supertokens-node/recipe/session/recipe'
import ThirdPartyRecipe from 'supertokens-node/recipe/thirdparty/recipe'
import ThirdPartyPasswordlessRecipe from 'supertokens-node/recipe/thirdpartypasswordless/recipe'
import ThirdPartyEmailPasswordRecipe from 'supertokens-node/recipe/thirdpartyemailpassword/recipe'
import EmailPasswordRecipe from 'supertokens-node/recipe/emailpassword/recipe'
import DashboardRecipe from 'supertokens-node/recipe/dashboard/recipe'
import EmailVerificationRecipe from 'supertokens-node/recipe/emailverification/recipe'
import JWTRecipe from 'supertokens-node/recipe/jwt/recipe'
import UserMetadataRecipe from 'supertokens-node/recipe/usermetadata/recipe'
import PasswordlessRecipe from 'supertokens-node/recipe/passwordless/recipe'
import UserRolesRecipe from 'supertokens-node/recipe/userroles/recipe'
import { ProcessState } from 'supertokens-node/processState'
import { Querier } from 'supertokens-node/querier'
import { maxVersion } from 'supertokens-node/utils'
import { OpenIdRecipe } from 'supertokens-node/recipe/openid/recipe'

export async function executeCommand(cmd: string): Promise<{ stdout: string; stderr: string }> {
  const cwd = process.cwd()
  return new Promise((resolve, reject) => {
    exec(cmd,
      { cwd },
      (err, stdout, stderr) => {
        if (err) {
          reject(err)
          return
        }
        resolve({ stdout, stderr })
      })
  })
}

export async function setKeyValueInConfig(key: any, value: any) {
  return new Promise((resolve, reject) => {
    const installationPath = process.env.INSTALL_PATH
    fs.readFile(`${installationPath}/config.yaml`, 'utf8', (err, data) => {
      if (err) {
        reject(err)
        return
      }
      const oldStr = new RegExp(`((#\\s)?)${key}(:|((:\\s).+))\n`)
      const newStr = `${key}: ${value}\n`
      const result = data.replace(oldStr, newStr)
      fs.writeFile(`${installationPath}/config.yaml`, result, 'utf8', (err) => {
        if (err)
          reject(err)

        else
          resolve('done')
      })
    })
  })
}

export function extractInfoFromResponse(res: any) {
  /* eslint-disable prefer-const */
  let antiCsrf = res.headers['anti-csrf']
  let accessToken
  let refreshToken
  let accessTokenExpiry
  let refreshTokenExpiry
  let idRefreshTokenExpiry
  let accessTokenDomain
  let refreshTokenDomain
  let idRefreshTokenDomain
  let accessTokenHttpOnly = false
  let idRefreshTokenHttpOnly = false
  let refreshTokenHttpOnly = false
  let frontToken = res.headers['front-token']
  let cookies = res.headers['set-cookie'] || res.headers['Set-Cookie']
  cookies = cookies === undefined ? [] : cookies
  if (!Array.isArray(cookies))
    cookies = [cookies]

  cookies.forEach((i: any) => {
    if (i.split(';')[0].split('=')[0] === 'sAccessToken') {
      /**
       * if token is sAccessToken=eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsInZlcnNpb24iOiIyIn0=.eyJzZXNzaW9uSGFuZGxlIjoiMWI4NDBhOTAtMjVmYy00ZjQ4LWE2YWMtMDc0MDIzZjNjZjQwIiwidXNlcklkIjoiIiwicmVmcmVzaFRva2VuSGFzaDEiOiJjYWNhZDNlMGNhMDVkNzRlNWYzNTc4NmFlMGQ2MzJjNDhmMTg1YmZmNmUxNThjN2I2OThkZDYwMzA1NzAyYzI0IiwidXNlckRhdGEiOnt9LCJhbnRpQ3NyZlRva2VuIjoiYTA2MjRjYWItZmIwNy00NTFlLWJmOTYtNWQ3YzU2MjMwZTE4IiwiZXhwaXJ5VGltZSI6MTYyNjUxMjM3NDU4NiwidGltZUNyZWF0ZWQiOjE2MjY1MDg3NzQ1ODYsImxtcnQiOjE2MjY1MDg3NzQ1ODZ9.f1sCkjt0OduS6I6FBQDBLV5zhHXpCU2GXnbe+8OCU6HKG00TX5CM8AyFlOlqzSHABZ7jES/+5k0Ff/rdD34cczlNqICcC4a23AjJg2a097rFrh8/8V7J5fr4UrHLIM4ojZNFz1NyVyDK/ooE6I7soHshEtEVr2XsnJ4q3d+fYs2wwx97PIT82hfHqgbRAzvlv952GYt+OH4bWQE4vTzDqGN7N2OKpn9l2fiCB1Ytzr3ocHRqKuQ8f6xW1n575Q1sSs9F9TtD7lrKfFQH+//6lyKFe2Q1SDc7YU4pE5Cy9Kc/LiqiTU+gsGIJL5qtMzUTG4lX38ugF4QDyNjDBMqCKw==; Max-Age=3599; Expires=Sat, 17 Jul 2021 08:59:34 GMT; Secure; HttpOnly; SameSite=Lax; Path=/'
       * i.split(";")[0].split("=")[1] will result in eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsInZlcnNpb24iOiIyIn0
       */
      accessToken = decodeURIComponent(i.split(';')[0].split('=').slice(1).join('='))
      if (i.split(';')[2].includes('Expires='))
        accessTokenExpiry = i.split(';')[2].split('=')[1]

      else if (i.split(';')[2].includes('expires='))
        accessTokenExpiry = i.split(';')[2].split('=')[1]

      else
        accessTokenExpiry = i.split(';')[3].split('=')[1]

      if (i.split(';')[1].includes('Domain='))
        accessTokenDomain = i.split(';')[1].split('=')[1]

      accessTokenHttpOnly = i.split(';').findIndex((j: any) => j.includes('HttpOnly')) !== -1
    }
    else if (i.split(';')[0].split('=')[0] === 'sRefreshToken') {
      refreshToken = i.split(';')[0].split('=').slice(1).join('=')
      if (i.split(';')[2].includes('Expires='))
        refreshTokenExpiry = i.split(';')[2].split('=')[1]

      else if (i.split(';')[2].includes('expires='))
        refreshTokenExpiry = i.split(';')[2].split('=')[1]

      else
        refreshTokenExpiry = i.split(';')[3].split('=')[1]

      if (i.split(';')[1].includes('Domain='))
        refreshTokenDomain = i.split(';')[1].split('=').slice(1).join('=')

      refreshTokenHttpOnly = i.split(';').findIndex((j: any) => j.includes('HttpOnly')) !== -1
    }
  })

  const refreshTokenFromHeader = res.headers['st-refresh-token']
  const accessTokenFromHeader = res.headers['st-access-token']

  const accessTokenFromAny = accessToken === undefined ? accessTokenFromHeader : accessToken
  const refreshTokenFromAny = refreshToken === undefined ? refreshTokenFromHeader : refreshToken

  return {
    status: res.status || res.statusCode,
    body: res.body,
    antiCsrf,
    accessToken,
    refreshToken,
    accessTokenFromHeader,
    refreshTokenFromHeader,
    accessTokenFromAny,
    refreshTokenFromAny,
    accessTokenExpiry,
    refreshTokenExpiry,
    idRefreshTokenExpiry,
    accessTokenDomain,
    refreshTokenDomain,
    idRefreshTokenDomain,
    frontToken,
    accessTokenHttpOnly,
    refreshTokenHttpOnly,
    idRefreshTokenHttpOnly,
  }
}

export function extractCookieCountInfo(res: { headers: { [x: string]: any } }) {
  let accessToken = 0
  let refreshToken = 0
  let idRefreshToken = 0
  let cookies = res.headers['set-cookie'] || res.headers['Set-Cookie']
  cookies = cookies === undefined ? [] : cookies
  if (!Array.isArray(cookies))
    cookies = [cookies]

  cookies.forEach((i: string) => {
    if (i.split(';')[0].split('=')[0] === 'sAccessToken')
      accessToken += 1

    else if (i.split(';')[0].split('=')[0] === 'sRefreshToken')
      refreshToken += 1

    else
      idRefreshToken += 1
  })
  return {
    accessToken,
    refreshToken,
    idRefreshToken,
  }
}

export async function setupST() {
  const installationPath = process.env.INSTALL_PATH
  try {
    await executeCommand(`cd ${installationPath} && cp temp/licenseKey ./licenseKey`)
  }
  catch (ignore) {}
  await executeCommand(`cd ${installationPath} && cp temp/config.yaml ./config.yaml`)
}

export async function cleanST() {
  const installationPath = process.env.INSTALL_PATH
  try {
    await executeCommand(`cd ${installationPath} && rm licenseKey`)
  }
  catch (ignore) {}
  await executeCommand(`cd ${installationPath} && rm config.yaml`)
  await executeCommand(`cd ${installationPath} && rm -rf .webserver-temp-*`)
  await executeCommand(`cd ${installationPath} && rm -rf .started`)
}

export async function stopST(pid: any) {
  const pidsBefore = await getListOfPids()
  if (pidsBefore.length === 0)
    return

  await executeCommand(`kill ${pid}`)
  const startTime = Date.now()
  while (Date.now() - startTime < 10000) {
    const pidsAfter = await getListOfPids()
    if (pidsAfter.includes(pid)) {
      await new Promise(resolve => setTimeout(resolve, 100))
      continue
    }
    else {
      return
    }
  }
  throw new Error(`error while stopping ST with PID: ${pid}`)
}

export function resetAll() {
  SuperTokens.reset()
  SessionRecipe.reset()
  ThirdPartyPasswordlessRecipe.reset()
  ThirdPartyEmailPasswordRecipe.reset()
  ThirdPartyPasswordlessRecipe.reset()
  EmailPasswordRecipe.reset()
  ThirdPartyRecipe.reset()
  EmailVerificationRecipe.reset()
  JWTRecipe.reset()
  UserMetadataRecipe.reset()
  UserRolesRecipe.reset()
  PasswordlessRecipe.reset()
  OpenIdRecipe.reset()
  DashboardRecipe.reset()
  ProcessState.getInstance().reset()
}

export async function killAllST() {
  const pids = await getListOfPids()
  for (let i = 0; i < pids.length; i++)
    await stopST(pids[i])

  resetAll()
  nock.cleanAll()
}

export async function killAllSTCoresOnly() {
  const pids = await getListOfPids()
  for (let i = 0; i < pids.length; i++)
    await stopST(pids[i])
}

export async function startST(host = 'localhost', port = 8080) {
  // TODO: remove this async
  // eslint-disable-next-line no-async-promise-executor
  return new Promise(async (resolve, reject) => {
    const installationPath = process.env.INSTALL_PATH
    const pidsBefore = await getListOfPids()
    let returned = false
    executeCommand(`cd ${installationPath} && java -Djava.security.egd=file:/dev/urandom -classpath "./core/*:./plugin-interface/*" io.supertokens.Main ./ DEV host=${host} port=${port} test_mode`).catch((err: any) => {
      if (!returned) {
        returned = true
        reject(err)
      }
    })
    const startTime = Date.now()
    while (Date.now() - startTime < 30000) {
      const pidsAfter = await getListOfPids()
      if (pidsAfter.length <= pidsBefore.length) {
        await new Promise(resolve => setTimeout(resolve, 100))
        continue
      }
      const nonIntersection = pidsAfter.filter(x => !pidsBefore.includes(x))
      if (nonIntersection.length !== 1) {
        if (!returned) {
          returned = true
          reject(new Error('something went wrong while starting ST'))
        }
      }
      else {
        if (!returned) {
          returned = true
          resolve(nonIntersection[0])
        }
      }
    }
    if (!returned) {
      returned = true
      reject(new Error('could not start ST process'))
    }
  })
}

async function getListOfPids() {
  const installationPath = process.env.INSTALL_PATH
  let currList: string | any[]
  try {
    currList = (await executeCommand(`cd ${installationPath} && ls .started/`)).stdout
  }
  catch (err) {
    return []
  }

  currList = currList.split('\n')

  const result = []
  for (let i = 0; i < currList.length; i++) {
    const item = currList[i]
    if (item === '')
      continue

    try {
      let pid = (await executeCommand(`cd ${installationPath} && cat .started/${item}`)).stdout
      pid = pid.split('\n')[0]
      result.push(pid)
    }
    catch (err) {}
  }
  return result
}

function createFormat(options: string | any[]) {
  if (options.length === 0)
    return ''

  let format = '\x1B['
  for (let i = 0; i < options.length; i++) {
    format += options[i]
    if (i !== options.length - 1)
      format += ';'
  }
  format += 'm'
  return format
}

const consoleOptions = {
  default: 0,
  bold: 1,
  dim: 2,
  italic: 3,
  underline: 4,
  blink: 5,
  white: 29,
  black: 30,
  red: 31,
  green: 32,
  yellow: 33,
  blue: 34,
  purple: 35,
  cyan: 36,
}

export async function signUPRequest(app: any, email: any, password: any) {
  return new Promise((resolve) => {
    request(app)
      .post('/auth/signup')
      .set('st-auth-mode', 'cookie')
      .send({
        formFields: [
          {
            id: 'password',
            value: password,
          },
          {
            id: 'email',
            value: email,
          },
        ],
      })
      .end((err: any, res: unknown) => {
        if (err)
          resolve(undefined)

        else
          resolve(res)
      })
  })
}

export async function signUPRequestEmptyJSON(app: any) {
  return new Promise((resolve) => {
    request(app)
      .post('/auth/signup')
      .send({})
      .end((err: any, res: unknown) => {
        if (err)
          resolve(undefined)

        else
          resolve(res)
      })
  })
}

export async function signUPRequestNoBody(app: any) {
  return new Promise((resolve) => {
    request(app)
      .post('/auth/signup')
      .end((err: any, res: unknown) => {
        if (err)
          resolve(undefined)

        else
          resolve(res)
      })
  })
}

export async function signInUPCustomRequest(app: any, email: any, id: any) {
  nock('https://test.com').post('/oauth/token').reply(200, {
    id,
    email,
  })
  return new Promise((resolve) => {
    request(app)
      .post('/auth/signinup')
      .send({
        thirdPartyId: 'custom',
        code: 'abcdefghj',
        redirectURI: 'http://127.0.0.1/callback',
      })
      .end((err: any, res: unknown) => {
        if (err)
          resolve(undefined)

        else
          resolve(res)
      })
  })
}

export async function emailVerifyTokenRequest(app: any, accessToken: any, antiCsrf: any, userId: any) {
  const result = await new Promise((resolve) => {
    request(app)
      .post('/auth/user/email/verify/token')
      .set('Cookie', [`sAccessToken=${accessToken}`])
      .set('anti-csrf', antiCsrf)
      .send({
        userId,
      })
      .end((err: any, res: unknown) => {
        if (err)
          resolve(undefined)
        else
          resolve(res)
      })
  })

  // wait for the callback to be called...
  await new Promise(resolve => setTimeout(resolve, 500))

  return result
}

export function mockLambdaProxyEvent(path: any, httpMethod: any, headers: any, body: any, proxy: any) {
  return {
    path,
    httpMethod,
    headers,
    body,
    requestContext: {
      path: `${proxy}${path}`,
    },
  }
}

export function mockLambdaProxyEventV2(path: any, httpMethod: any, headers: any, body: any, proxy: string | any[], cookies: any, queryParams: any) {
  return {
    version: '2.0',
    httpMethod,
    headers,
    body,
    cookies,
    requestContext: {
      http: {
        path: `${proxy}${path}`,
      },
      stage: proxy.slice(1),
    },
    queryStringParameters: queryParams,
  }
}

export async function isCDIVersionCompatible(compatibleCDIVersion: any) {
  const currCDIVersion = await Querier.getNewInstanceOrThrowError(undefined).getAPIVersion()

  if (
    maxVersion(currCDIVersion, compatibleCDIVersion) === compatibleCDIVersion
        && currCDIVersion !== compatibleCDIVersion
  )
    return false

  return true
}

export function generateRandomCode(size: number) {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXTZabcdefghiklmnopqrstuvwxyz'
  let randomString = ''

  // loop to select a new character in each iteration
  for (let i = 0; i < size; i++) {
    const randdomNumber = Math.floor(Math.random() * characters.length)
    randomString += characters.substring(randdomNumber, randdomNumber + 1)
  }
  return randomString
}
export async function delay(time: number) {
  await new Promise(resolve => setTimeout(resolve, time * 1000))
}

export function areArraysEqual(arr1: any[], arr2: any[]) {
  if (arr1.length !== arr2.length)
    return false

  arr1.sort()
  arr2.sort()

  for (const index in arr1) {
    if (arr1[index] !== arr2[index])
      return false
  }

  return true
}

/**
 *
 * @returns {import("express").Response}
 */
export const mockResponse = () => {
  const headers = {} as any
  const res = {
    getHeaders: () => headers,
    getHeader: (key: string | number) => headers[key],
    setHeader: (key: string | number, val: any) => (headers[key] = val),
  }
  return res
}

/**
 *
 * @returns {import("express").Request}
 */
export const mockRequest = () => {
  const headers = {} as any
  const req = {
    headers,
    get: (key: string | number) => headers[key],
    header: (key: string | number) => headers[key],
  }
  return req
}

export function printPath(path: any) {
  return `${createFormat([consoleOptions.yellow, consoleOptions.italic, consoleOptions.dim])}${path}${createFormat([
        consoleOptions.default,
    ])}`
}

export const getAllFilesInDirectory = (path: any): any => {
  return fs
    .readdirSync(path, {
      withFileTypes: true,
    })
    .flatMap((file: any) => {
      if (file.isDirectory())
        return getAllFilesInDirectory(join(path, file.name))

      else
        return join(path, file.name)
    })
}
