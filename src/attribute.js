
if (typeof define !== 'function') {
    var define = require('amdefine')(module);
}

define(function (require) {
    'use strict';
    
    var ncDefs = require('./ncDefs.js'),
        numberType = ncDefs.numberType,
        padLength = ncDefs.padLength,
        padBuffer = ncDefs.padBuffer,
        readType = ncDefs.readType,
        writeArray = ncDefs.writeArray,
        readArray = ncDefs.readArray,
        writeArraySize = ncDefs.writeArraySize;

    var types = require('./types.js');

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
        this.toString = function (tab) {
            var str = [], j;
            //if (values.length === 0) { return ''; }
            if (tab === undefined) { tab = ''; }
            if (type.numeric) {
                for (j = 0; j < values.length; j++) {
                    str.push(type.toString(values[j]));
                }
            } else {
                str.push(type.toString(values.join("")));
            }
            return tab + name + " = " + str.join(", ") + " ;\n";
        };
        this.writeSize = function () {
            var n = writeArraySize(types.char, name) + numberType.size * 2 + this.getLength() * type.size;
            return n + padLength(n);
        };
        this.write = function (buffer) {
            writeArray(buffer, types.char, name);
            buffer.write(numberType, type.id);
            buffer.write(numberType, this.getLength());
            buffer.write(type, values);
            padBuffer(buffer);
        };
        Object.seal(this);
    }
    Attribute.read = function(buffer) {
        var name = readArray(buffer, types.char),
            type = readType(buffer),
            values = readArray(buffer, type),
            attr = new Attribute(name, type);
        attr.setValue(values);
        return attr;
    };

    return Attribute;
});
