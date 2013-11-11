
/*global define*/
(function (root, factory) {
    'use strict';

    if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define(factory);
    } else if (typeof exports === 'object') {
        // Node. Does not work with strict CommonJS, but
        // only CommonJS-like enviroments that support module.exports,
        // like Node.
        module.exports = factory();
    } else {
        // Browser globals (root is window)
        root.returnExports = factory();
    }
}(this, function () {
    'use strict';
    function getIndex(A, s) {
        var i;
        for (i = 0; i < A.length; i++) {
            if (A[i] === s) { return i; }
        }
        return -1;
    }
    return {
        getIndex: getIndex,
        getValue: function (A, B, s) {
            var i = getIndex(A, s);
            if (i >= 0) { return B[i]; }
        },
        getObj: function (A, B) {
            var i, obj = {};
            for (i = 0; i < A.length; i++) {
                obj[A[i]] = B[i];
            }
            return obj;
        },
        dP: Object.defineProperty
    };
}));
