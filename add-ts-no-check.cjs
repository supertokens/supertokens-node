const glob = require("glob");
const { readFileSync, writeFileSync } = require("fs");

glob(__dirname + "/lib/**/*.d.ts", (err, files) => {
    for (file of files) {
        let contents = readFileSync(file);
        contents = contents.toString();
        let lines = contents.split("\n");
        let newContents = `// @ts-nocheck`;
        for (line of lines) {
            if (line.match(/\/\/\/\ \<reference\ types\=\"(express|koa|loopback|hapi|aws|fastify)/g) === null) {
                newContents += `\n${line}`;
            }
        }
        writeFileSync(file, newContents);
    }
});
