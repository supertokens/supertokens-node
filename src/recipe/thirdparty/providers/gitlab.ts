/* Copyright (c) 2023, VRAI Labs and/or its affiliates. All rights reserved.
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

import axios from 'axios'
import { TypeProvider, TypeProviderGetResponse } from '../types'
import NormalisedURLDomain from '../../../normalisedURLDomain'

interface TypeThirdPartyProviderGitLabConfig {
  clientId: string
  clientSecret: string
  scope?: string[]
  authorisationRedirect?: {
    params?: { [key: string]: string | ((request: any) => string) }
  }
  gitlabBaseUrl?: string
  isDefault?: boolean
}

export default function GitLab(config: TypeThirdPartyProviderGitLabConfig): TypeProvider {
  const id = 'gitlab'

  function get(redirectURI: string | undefined, authCodeFromRequest: string | undefined): TypeProviderGetResponse {
    const baseUrl
            = config.gitlabBaseUrl === undefined
              ? 'https://gitlab.com' // no traling slash cause we add that in the path
              : new NormalisedURLDomain(config.gitlabBaseUrl).getAsStringDangerous()
    const accessTokenAPIURL = `${baseUrl}/oauth/token`
    const accessTokenAPIParams: { [key: string]: string } = {
      client_id: config.clientId,
      client_secret: config.clientSecret,
      grant_type: 'authorization_code',
    }
    if (authCodeFromRequest !== undefined)
      accessTokenAPIParams.code = authCodeFromRequest

    if (redirectURI !== undefined)
      accessTokenAPIParams.redirect_uri = redirectURI

    const authorisationRedirectURL = `${baseUrl}/oauth/authorize`
    let scopes = ['read_user']
    if (config.scope !== undefined) {
      scopes = config.scope
      scopes = Array.from(new Set(scopes))
    }
    const additionalParams
            = (config.authorisationRedirect === undefined || config.authorisationRedirect.params === undefined)
              ? {}
              : config.authorisationRedirect.params
    const authorizationRedirectParams: { [key: string]: string } = {
      scope: scopes.join(' '),
      response_type: 'code',
      client_id: config.clientId,
      ...additionalParams,
    }

    async function getProfileInfo(accessTokenAPIResponse: {
      access_token: string
      expires_in: number
      token_type: string
      refresh_token?: string
    }) {
      const accessToken = accessTokenAPIResponse.access_token
      const authHeader = `Bearer ${accessToken}`
      const response = await axios({
        method: 'get',
        url: `${baseUrl}/api/v4/user`,
        headers: {
          Authorization: authHeader,
        },
      })
      const userInfo = response.data
      const id = `${userInfo.id}`
      const email = userInfo.email
      if (email === undefined || email === null) {
        return {
          id,
        }
      }
      const isVerified = userInfo.confirmed_at !== null && userInfo.confirmed_at !== undefined
      return {
        id,
        email: {
          id: email,
          isVerified,
        },
      }
    }

    return {
      accessTokenAPI: {
        url: accessTokenAPIURL,
        params: accessTokenAPIParams,
      },
      authorisationRedirect: {
        url: authorisationRedirectURL,
        params: authorizationRedirectParams,
      },
      getProfileInfo,
      getClientId: () => {
        return config.clientId
      },
    }
  }

  return {
    id,
    get,
    isDefault: config.isDefault,
  }
}
