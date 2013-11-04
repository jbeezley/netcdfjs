
if (typeof define !== 'function') {
    var define = require('amdefine')(module);
}

define(function (require) {
    'use strict';

    var types = require('./types.js');

    function Buffer(buffer) {
        var index = 0, that = this;
        this.tell = function () { return index; };
        this.seek = function (newIndex) { index = newIndex; };
        this.write = function (type, value) {
            var i;
            if (Array.isArray(value)) {
                for (i = 0; i < value.length; i++) {
                    that.write(type, value[i]);
                }
            } else {
            }
        };
        this.read = function (type, n) {
        };
    }

    return Buffer;
});
