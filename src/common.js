/*jshint forin: false */

'use strict';

function getIndex(A, s) {
    var i;
    for (i = 0; i < A.length; i++) {
        if (A[i] === s) { return i; }
    }
    return -1;
}

function ViewFromBuffer(b) {
    this.getUint8 = function(index) {
        return b.readUInt8(index);
    };
    this.setUint8 = function(index, value) {
        return b.writeUInt8(index, value);
    };
    this.getInt8 = function(index) {
        return b.readInt8(index);
    };
    this.setInt8 = function(index, value) {
        return b.writeInt8(index, value);
    };
    this.getInt16 = function(index) {
        return b.readInt16BE(index);
    };
    this.setInt16 = function(index, value) {
        return b.writeInt16BE(index, value);
    };
    this.getInt32 = function(index) {
        return b.readInt32BE(index);
    };
    this.setInt32 = function(index, value) {
        return b.writeInt32BE(index, value);
    };
    this.getFloat32 = function(index) {
        return b.readFloatBE(index);
    };
    this.setFloat32 = function(index, value) {
        return b.writeFloatBE(index, value);
    };
    this.getFloat64 = function(index) {
        if (Number.isNaN(index)) {
            throw new Error("NaN index");
        }
        return b.readDoubleBE(index);
    };
    this.setFloat64 = function(index, value) {
        return b.writeDoubleBE(index, value);
    };
    this.slice = function(start, end) {
        return new ViewFromBuffer(b.slice(start, end));
    };
    this.length = b.length;
    this.byteLength = b.length;
}

module.exports = {
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
    getDataView: function (obj) {
        var view;
        if (obj.constructor === ArrayBuffer) {
            return new DataView(obj);
        } else if (obj.constructor === DataView) {
            return obj;
        } else if (typeof obj === 'number') {
            return new DataView(new ArrayBuffer(obj));
        } else if (obj.hasOwnProperty('buffer')) {
            return new DataView(obj.buffer);
        } else if (typeof obj.readUInt8 === 'function' && !obj.hasOwnProperty('getUint8')) {
            view = new ViewFromBuffer(obj);
            return view;
        } else {
            throw new Error("Invalid input parameter");
        }
    },
    dP: Object.defineProperty,
    flatten: function (A, type) {
        var i, buf, n, j, k;
        if (A.length === 0) {
            return [];
        } else if (A.length === 1) {
            return A[0].data;
        } else {
            n = A[0].size;
            buf = new type.typedArray(n * A.length);
            for (i = 0; i < A.length; i++) {
                k = 0;
                for (j = 0; j < n; j++) {
                    //console.log(i + " " + j + " " + type.read(j * type.typeSize, A[i].data));
                    buf.set(j + i*n, type.read(j * type.typeSize, A[i].data));
                }
            }
            return buf;
        }
    }
};
