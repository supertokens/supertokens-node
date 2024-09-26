auth=`cat .pat | base64`
branch=git rev-parse --abbrev-ref HEAD
curl --request POST \
  --url https://circleci.com/api/v2/project/gh/CircleCI-Public/api-preview-docs/pipeline \
  --header 'authorization: Basic '$auth \
  --header 'content-type: application/json' \
  --data '{"branch":"'$branch'","parameters":{ "force": true, "cdi-core-map": { "5.1": "feat/oauth-provider-base" }, "cdi-plugin-interface-map": { "5.1": "feat/oauth-provider-base" }, "fdi-node-map": { "3.1": "/feat/oauth2/base" }, "fdi-website-map": { "3.1": "master" }, "fdi-auth-react-map": { "3.1": "/feat/oauth2/base" } }}'