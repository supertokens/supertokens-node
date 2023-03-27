import { inject, intercept } from '@loopback/core'
import { MiddlewareContext, RestApplication, RestBindings, post, response } from '@loopback/rest'
import { middleware } from 'supertokens-node/framework/loopback'
import { verifySession } from 'supertokens-node/recipe/session/framework/loopback'
import Session, { SessionContainer } from 'supertokens-node/recipe/session'

class Create {
  constructor(@inject(RestBindings.Http.CONTEXT) private ctx: MiddlewareContext) {}
  @post('/create')
  @response(200)
  async handler() {
    await Session.createNewSession(this.ctx, this.ctx, 'userId', {}, {})
    return {}
  }
}

class CreateThrowing {
  constructor(@inject(RestBindings.Http.CONTEXT) private ctx: MiddlewareContext) {}
  @post('/create-throw')
  @response(200)
  async handler() {
    await Session.createNewSession(this.ctx, this.ctx, 'userId', {}, {})
    throw new Session.Error({
      message: 'unauthorised',
      type: Session.Error.UNAUTHORISED,
    })
  }
}
class Verify {
  constructor(@inject(RestBindings.Http.CONTEXT) private ctx: MiddlewareContext) {}
  @post('/session/verify')
  @intercept(verifySession())
  @response(200)
  handler() {
    return {
      user: ((this.ctx as any).session as SessionContainer).getUserId(),
    }
  }
}

class VerifyOptionalCSRF {
  constructor(@inject(RestBindings.Http.CONTEXT) private ctx: MiddlewareContext) {}
  @post('/session/verify/optionalCSRF')
  @intercept(verifySession({ antiCsrfCheck: false }))
  @response(200)
  handler() {
    return {
      user: ((this.ctx as any).session as SessionContainer).getUserId(),
    }
  }
}

class Revoke {
  constructor(@inject(RestBindings.Http.CONTEXT) private ctx: MiddlewareContext) {}
  @post('/session/revoke')
  @intercept(verifySession())
  @response(200)
  async handler() {
    await ((this.ctx as any).session as SessionContainer).revokeSession()
    return {}
  }
}

const app = new RestApplication({
  rest: {
    port: 9876,
  },
})

app.middleware(middleware)
app.controller(Create)
app.controller(CreateThrowing)
app.controller(Verify)
app.controller(Revoke)
app.controller(VerifyOptionalCSRF)
export { app }
module.exports = app
