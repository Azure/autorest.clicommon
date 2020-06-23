import { assert } from "chai";
import "mocha";
import { readdir } from "@azure-tools/async-io";
import { exec } from "child_process";

describe("Scenario test", function () {
    it("generate and compare yaml", async () => {
        const dir = `${__dirname}/scenarios/`;
        const folders = await readdir(dir);
        let result = true;
        let msg = "";
        let finalResult = true;
        for (const each of folders) {
            console.log(`Processing: ${each}`);
            try {
                await runCli(dir + each)
                    .then((res) => {
                        if (res == false) {
                            msg = "Run autorest not successfully!";
                        }
                        result = res;
                    })
                    .catch((err) => {
                        msg = "Run autorest failed!";
                        result = err;
                    });
                if (result) {
                    await compare(dir + each + "/output/", dir + each + "/tmpoutput/")
                        .then((res1) => {
                            if (res1 == false) {
                                msg = "The generated files have changed!";
                            }
                            result = res1;
                        })
                        .catch((e) => {
                            msg = "The diff has some error";
                            result = e;
                        });
                }
            } catch (error) {
                console.log(msg);
                result = false;
                break;
            }
            if (!result) {
                finalResult = false;
            }
            assert.strictEqual(result, true, msg);
        }
        assert.strictEqual(finalResult, true, msg);
    }).timeout(120000);
});

async function runCli(directory: string) {
    let cmd = `${__dirname}/../node_modules/.bin/autorest --version=3.0.6271 --use=${__dirname}/../ ${directory}/configuration/readme.md --output-folder=${directory}/tmpoutput/ --debug`;
    console.log(cmd);
    return await new Promise<boolean>((resolve, reject) => {
        exec(cmd, function (error) {
            if (error !== null) {
                console.log("exec error: " + error);
                // Reject if there is an error:
                return reject(false);
            }
            // Otherwise resolve the promise:
            return resolve(true);
        });
    });
}

async function compare(dir1: string, dir2: string) {
    let cmd = "diff -r --strip-trailing-cr " + dir1 + " " + dir2;
    console.log(cmd);
    return await new Promise<boolean>((resolve, reject) => {
        exec(cmd, function (error, stdout) {
            if (error !== null) {
                console.log("exec error: " + error + ", " + stdout);
                // Reject if there is an error:
                return reject(false);
            }
            // Otherwise resolve the promise:
            return resolve(true);
        });
    });
}
