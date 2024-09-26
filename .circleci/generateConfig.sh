coreDriverJson=`cat ../coreDriverInterfaceSupported.json`
coreDriverArray=`echo $coreDriverJson | jq ".versions"`

frontendDriverJson=`cat ../frontendDriverInterfaceSupported.json`
frontendDriverArray=`echo $frontendDriverJson | jq ".versions"`

if [ -z "$SUPERTOKENS_API_KEY" ]; then
    echo "SUPERTOKENS_API_KEY missing"
    exit 1;
fi

sed -i -e 's/cdi-version: placeholder/cdi-version: '`printf "%q" $coreDriverArray`'/' config_continue.yml
sed -i -e 's/fdi-version: placeholder/fdi-version: '`printf "%q" $frontendDriverArray`'/' config_continue.yml

if [ "$1" = "true" ]; then
    sed -i -e 's/test-cicd\\\/\.\*/.*/' config_continue.yml
    sed -i -e "s@^            - checkout@            - checkout\n            - run: echo '$2' >> .circleci\/cdi-core-map.json@" config_continue.yml
    sed -i -e "s@^            - checkout@            - checkout\n            - run: echo '$3' >> .circleci\/cdi-plugin-interface-map.json@" config_continue.yml
    sed -i -e "s@^            - checkout@            - checkout\n            - run: echo '$4' >> .circleci\/fdi-node-map.json@" config_continue.yml
    sed -i -e "s@^            - checkout@            - checkout\n            - run: echo '$5' >> .circleci\/fdi-auth-react-map.json@" config_continue.yml
    sed -i -e "s@^            - checkout@            - checkout\n            - run: echo '$6' >> .circleci\/fdi-website-map.json@" config_continue.yml
fi
