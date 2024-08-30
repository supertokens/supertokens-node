"use strict";
// Check if 'Buffer' is available, if not, polyfill it
if (typeof Buffer === 'undefined') {
    global.Buffer = require('buffer').Buffer;
}
// Check if 'process' is available, if not, polyfill it
if (typeof process === 'undefined') {
    global.process = require('process');
}
