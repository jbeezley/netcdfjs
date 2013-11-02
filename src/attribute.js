
if (typeof define !== 'function') {
    var define = require('amdefine')(module);
}

define(function (require) {
    'use strict';
    
    var ncDefs = require('./ncDefs.js'),
        numberType = ncDefs.numberType,
        padLength = ncDefs.padLength,
        padBuffer = ncDefs.padBuffer;

    function Attribute(name, type) {
        var values = [];
        this.name = name;
        this.type = type;
        this.getValue = function (i) {
            if (i === undefined) {
                if (type.string) {
                    return values.join('');
                } else {
                    return values.slice();
                }
            } else {
                return values[i];
            }
        };
        this.getLength = function () {
            return values.length;
        };
        this.removeValue = function (i) {
            values.splice(i,1);
        };
        this.clear = function () {
            values = [];
        };
        this.setValue = function (value, i) {
            var j;
            if ( i === undefined ) {
                values = [];
                i = 0;
            }
            if (value.hasOwnProperty("length") && value.length !== 1) {
                values = [];
                for (j = 0; j < value.length; j++) {
                    this.setValue(value[j], j);
                }
                return;
            }
            if (!type.validate(value)) {
                throw new Error("Invalid value for type " + type.toString());
            }
            if ( typeof(i) !== "number" || i < 0 || Number(i.toFixed(0)) !== i ) {
                throw new Error("Invalid index");
            }
            values[i] = value;
        };
        this.writeSize = function () {
            var n = numberType.size * 2 + this.getLength() * type.size;
            return n + padLength(n);
        };
        this.write = function (buffer) {
            buffer.write(numberType, type.id);
            buffer.write(numberType, this.getLength());
            buffer.write(type, values);
            padBuffer(buffer);
        };
        Object.seal(this);
    }

    return Attribute;
});
