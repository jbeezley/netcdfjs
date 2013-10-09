if (typeof define !== 'function') {
    var define = require('amdefine')(module);
}

define(function () {
    'use strict';
    var numberSize = 4, numberType = 'int32';
    function padLength (n) {
            // get the number of bytes of padding needed for an object of size n
            return (4 - (n % 4)) % 4;
    }
    function padBuffer(buffer) {
        var i, n = padLength(buffer.tell());
        for (i = 0; i < n; i++) {
            buffer.write('int8',0);
        }
    }
    function padSkip(buffer) {
        var n = padLength(buffer.tell());
        buffer.seek(buffer.tell() + n);
    }
    return {
        dP: Object.defineProperty,
        numberSize: numberSize,
        numberType: numberType,
        padLength: padLength,
        padBuffer: padBuffer,
        padSkip: padSkip,
        stringSize: function(s) {
            // return the number of bytes required to store a given string
            // format:
            //   length + string + padding
            // (strings are padded to 32 bit boundaries)
            return numberSize + s.length + padLength(s.length);
        },
        writeString: function (s, buffer) {
            // write the string s to the buffer
            buffer.write(numberType, s.length);
            buffer.write('char', s);
            padBuffer(buffer);
        },
        readString: function (buffer) {
            var s, n = buffer.read(numberType);
            s = buffer.read('char', n);
            padSkip(buffer);
            return s;
        }
    }
})