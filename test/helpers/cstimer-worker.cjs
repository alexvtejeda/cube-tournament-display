// Runs cstimer_module in a Node worker thread the way a browser runs it as a WebWorker: it installs
// self.onmessage and answers through a global postMessage.
const { parentPort } = require('node:worker_threads');

globalThis.self = globalThis;
globalThis.postMessage = (message) => parentPort.postMessage(message);
require('cstimer_module');
parentPort.on('message', (data) => self.onmessage({ data }));
