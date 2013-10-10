if (typeof define !== 'function') {
    var define = require('amdefine')(module);
}

define( function () {
    'use strict';
    var TWO_32 = Math.pow(2, 32);
    var doWarn = false;
    
    // simple dataview wrapper based in part on jdataview
    function wrapDataView(buffer) {
        var index = 0, d = [];
        this.tell = function () {
            return index;
        };
        this.seek = function (offset) {
            if (offset) {
                index = offset
            } else {
                index = 0;
            }
        };
        this.debugString = function () {
            return d.join(" ");
        }
        this._write = function (type, value) {
            var hi, lo;
            //console.log(type, value, index);
            d.push(value.toString());
            if (type === 'int8') {
                buffer.setInt8(index, value);
                index += 1;
            } else if (type === 'char') {
                buffer.setUint8(index, value.charCodeAt(0));
                index += 1;
            } else if (type === 'int16') {
                buffer.setInt16(index, value);
                index += 2;
            } else if (type === 'int32') {
                buffer.setInt32(index, value);
                index += 4;
            } else if (type === 'int64') {
                hi = Math.floor(value / TWO_32);
                lo = value - hi * TWO_32;
                if (value < 0) {
                    hi += TWO_32;
                }
                buffer.setInt32(index, hi);
                index += 4;
                buffer.setUint32(index, lo);
                index += 4;
            } else if (type === 'float32') {
                buffer.setFloat32(index, Number(value).toPrecision(7));
                index += 4;
            } else if (type === 'float64') {
                buffer.setFloat64(index, value);
                index += 8;
            } else {
                throw Error('Unknown type.');
            }
        };
        this.write = function (type, value) {
            var i;
            if (Array.isArray(value) || type === 'char') {
                for (i = 0; i < value.length; i++) {
                    this._write(type, value[i]);
                }
            } else {
                this._write(type, value);
            }
        }
        this._read = function (type) {
            var value, hi;
            if (type === 'int8') {
                value = buffer.getInt8(index);
                index += 1;
            } else if (type === 'char') {
                value = String.fromCharCode(buffer.getUint8(index));
                index += 1;
            } else if (type === 'int16') {
                value = buffer.getInt16(index);
                index += 2;
            } else if (type === 'int32') {
                value = buffer.getInt32(index);
                index += 4;
            } else if (type === 'int64') {
                value = buffer.getInt32(index);
                index += 4;
                hi = 0;
                if (value) {
                    if (doWarn) {
                        // warn on precision loss
                        console.log("WARNING: converting 64 bit integer into a double.");
                    }
                    hi = TWO_32 * value;
                }
                value = hi + buffer.getUint32(index);
                index += 4;
            } else if (type === 'float32') {
                value = Number(buffer.getFloat32(index).toPrecision(7));
                index += 4;
            } else if (type === 'float64') {
                value = buffer.getFloat64(index);
                index += 8;
            } else {
                throw Error('Unknown type.');
            }
            return value;
        };
        this.read = function (type, size) {
            var i, value;
            if (size !== undefined) {
                value = [];
                for (i = 0; i < size; i++) {
                    value.push(this._read(type));
                }
                if (type === 'char') {
                    value = value.join("");
                }
            } else {
                value = this._read(type);
            }
            return value;
        }
    }
    return wrapDataView;
})