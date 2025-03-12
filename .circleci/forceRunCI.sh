PAT=`cat .pat`
auth=`echo "${PAT}:" | tr -d '\n' | base64 --wrap=0`
branch=`git rev-parse --abbrev-ref HEAD`

cdiCoreMap='{ }'
cdiPluginInterfaceMap='{ }'
fdiNodeMap='{ "3.1": "21.0", "4.0": "feat/webauthn/base" }'
fdiWebsiteMap='{ "1.17": "20.1", "1.18": "20.1", "1.19": "20.1", "2.0": "20.1", "3.0": "20.1", "3.1": "20.1", "4.0": "20.1" }'
fdiAuthReactMap='{ "3.1": "0.49", "4.0": "feat/webauthn/base" }'

data=`jq -cn --arg branch "$branch" \
  --arg cdiCoreMap "$cdiCoreMap" \
  --arg cdiPluginInterfaceMap "$cdiPluginInterfaceMap" \
  --arg fdiNodeMap "$fdiNodeMap" \
  --arg fdiWebsiteMap "$fdiWebsiteMap" \
  --arg fdiAuthReactMap "$fdiAuthReactMap" \
  '{ branch: $ARGS.named.branch, parameters: { force: true, "cdi-core-map": $ARGS.named.cdiCoreMap, "cdi-plugin-interface-map": $ARGS.named.cdiPluginInterfaceMap, "fdi-node-map": $ARGS.named.fdiNodeMap, "fdi-website-map": $ARGS.named.fdiWebsiteMap, "fdi-auth-react-map": $ARGS.named.fdiAuthReactMap }}'`

curl --request POST \
  --url 'https://circleci.com/api/v2/project/gh/supertokens/supertokens-node/pipeline' \
  --header "authorization: Basic $auth" \
  --header 'content-type: application/json' \
  --data "$data"
