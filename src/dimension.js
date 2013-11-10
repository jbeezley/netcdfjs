
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
    
    function Dimension(size) {
        if (size === undefined) { size = 0; }
        if (typeof size !== 'number' || size < 0 || !Number.isFinite(size)) {
            throw new Error("Invalid dimension size: " + size);
        }
        this.size = size;
        this.unlimited = size === 0;
        Object.freeze(this);
    }

    return Dimension;
}));
