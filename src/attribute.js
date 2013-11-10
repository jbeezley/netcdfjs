
/*global define*/
(function (root, factory) {
    'use strict';

    if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define(['types'], factory);
    } else if (typeof exports === 'object') {
        // Node. Does not work with strict CommonJS, but
        // only CommonJS-like enviroments that support module.exports,
        // like Node.
        module.exports = factory(require('types'));
    } else {
        // Browser globals (root is window)
        root.returnExports = factory(root.types);
    }
}(this, function (types) {
    'use strict';
    
    var dP = Object.defineProperty;

    function Attribute(typeName) {
        var values = [], type = types[typeName], that = this;
        if (type === undefined) {
            throw new Error("Invalid type: " + typeName);
        } else if (typeName === 'string') {
            values = '';
        }
        dP(this, 'set', { value: function (val, index) {
            var i;
            if (!Array.isArray(val) && !type.validate(val)) {
                throw new Error("Invalid value for attribute type: " + typeName);
            }
            if (index === undefined) {
                if (Array.isArray(val)) {
                    values = [];
                    for (i = 0; i < val.length; i++) {
                        that.set(val[i], i);
                    }
                } else if (typeName === 'string') {
                    values = val;
                } else {
                    values = [val];
                }
            } else if (typeName === 'string') {
                values = val;
            } else {
                values[index] = val;
            }
            type.validate(values);
        }});
        dP(this, 'get', { value: function (index) {
            if (index === undefined) {
                return values.slice();
            } else {
                return values[index];
            }
        }});
        dP(this, 'length', { get: function () {
            return values.length;
        }});
        Object.freeze(this);
    }

    return Attribute;
}));
