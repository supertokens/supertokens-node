#!/bin/bash
OS=$(uname -s)

files=$(find ./lib -type f -name "*.d.ts")
for file_name in $files
do
    if [ "$OS" = "Darwin" ]
    then
        sed -E -i '' '1s/^/\/\/\ \@ts\-nocheck\n/' $file_name
        sed -E -i '' '/\/\/\/\ <reference\ types\=\"(express|koa|loopback|hapi|aws|fastify)/d' $file_name
    else
        sed -E -i '1s/^/\/\/\ \@ts\-nocheck\n/' $file_name
        sed -E -i '/\/\/\/\ <reference\ types\=\"(express|koa|loopback|hapi|aws|fastify)/d' $file_name
    fi
done
