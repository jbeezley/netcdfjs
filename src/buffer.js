
if (typeof define !== 'function') {
    var define = require('amdefine')(module);
}

define(function () {
    'use strict';

    function Buffer(buffer) {
        var index = 0;
        this.tell = function () { return index; };
        this.seek = function (newIndex) { index = newIndex; };
        this.read = function (type, count) {
            var val = type.read(index, buffer, count);
            if (count > 1) {
                index += count * type.size;
            } else {
                index += type.size;
            }
            return val;
        };
        this.write = function (type, value) {
            index += type.write(index, buffer, value);
        };
        this.length = buffer.byteLength;
    }

    return Buffer;
});
