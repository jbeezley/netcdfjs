
/*global define*/
(function (root, factory) {
    'use strict';

    if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define(['common'], factory);
    } else if (typeof exports === 'object') {
        // Node. Does not work with strict CommonJS, but
        // only CommonJS-like enviroments that support module.exports,
        // like Node.
        module.exports = factory(require('common'));
    } else {
        // Browser globals (root is window)
        root.returnExports = factory(root.common);
    }
}(this, function (common) {
    'use strict';

    var dP = common.dP;

    function Dimension(size, getNRecs) {
        var that = this;
        if (size === undefined) { size = 0; }
        if (typeof size !== 'number' || size < 0 || !Number.isFinite(size)) {
            throw new Error("Invalid dimension size: " + size);
        }
        dP(this, 'size', { value: size });
        dP(this, 'unlimited', { value: size === 0 });
        dP(this, 'toString', { value: function () {
            if (that.unlimited) {
                return 'UNLIMITED';
            } else {
                return size.toString();
            }
        }});
        Object.freeze(this);
    }

    return Dimension;
}));
