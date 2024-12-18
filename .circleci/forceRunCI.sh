PAT=`cat .pat`
auth=`echo "${PAT}:" | tr -d '\n' | base64 --wrap=0`
branch=`git rev-parse --abbrev-ref HEAD`

cdiCoreMap='{ }' # "5.2": "feat/oauth/allow-list"
cdiPluginInterfaceMap='{ }' # "5.2": "feat/oauth/allow-list"
fdiNodeMap='{ }' # "3.1": "feat/add_clientId_secret_and_refreshTokenRotation_settings", "4.0": "feat/add_clientId_secret_and_refreshTokenRotation_settings"
fdiWebsiteMap='{ }' # "1.17": "20.1", "1.18": "20.1", "1.19": "20.1", "2.0": "20.1", "3.0": "20.1", "3.1": "20.1", "4.0": "20.1"
fdiAuthReactMap='{ }' # "3.1": "0.48", "4.0": "0.48"

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
