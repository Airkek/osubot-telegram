/* eslint-disable */
const http = require("http");

const configuredPort = Number(process.env.PORT);
const port = Number.isInteger(configuredPort) && configuredPort > 0 && configuredPort <= 65535 ? configuredPort : 3000;

const options = {
    host: "localhost",
    port,
    path: "/health",
    timeout: 10000,
};

const req = http.request(options, (res) => {
    console.log(`STATUS: ${res.statusCode}`);
    if (res.statusCode === 200) {
        process.exit(0);
    } else {
        process.exit(1);
    }
});

req.on("error", (e) => {
    console.error(`ERROR: ${e.message}`);
    process.exit(1);
});

req.end();
