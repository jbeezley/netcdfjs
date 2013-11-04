
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
            return type.read(index, buffer, count);
        };
        this.write = function (type, value) {
            type.write(index, buffer, value);
        };
    }

    return Buffer;
});
