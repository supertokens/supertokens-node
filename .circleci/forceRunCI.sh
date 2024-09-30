PAT=`cat .pat`
auth=`echo "${PAT}:" | tr -d '\n' | base64 --wrap=0`
branch=`git rev-parse --abbrev-ref HEAD`

cdiCoreMap='{ "5.1": "feat/oauth-provider-base" }'
cdiPluginInterfaceMap='{ "5.1": "feat/oauth-provider-base" }'
fdiNodeMap='{ "3.1": "feat/oauth2/base", "4.0": "feat/oauth2/base" }'
fdiWebsiteMap='{ "1.17": "ci/support_custom_tags", "1.18": "ci/support_custom_tags", "1.19": "ci/support_custom_tags", "2.0": "ci/support_custom_tags", "3.0": "ci/support_custom_tags", "3.1": "ci/support_custom_tags", "4.0": "ci/support_custom_tags" }'
fdiAuthReactMap='{ "3.1": "feat/oauth2/examples", "4.0": "feat/oauth2/examples" }'

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
