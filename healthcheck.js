/* eslint-disable */
const http = require("http");

const options = {
    host: "localhost",
    port: Number(process.env.PORT),
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
