
if (typeof define !== 'function') {
    var define = require('amdefine')(module);
}

define(function (require) {
    'use strict';
    
    var types = require('./types.js');

    function padLength(n) {
        return (4 - (n % 4)) % 4;
    }

    function padBuffer(buffer) {
        var i, n = padLength(buffer.tell());
        for (i = 0; i < n; i++) {
            buffer.write(types.int8, 0);
        }
    }

    function padSkip(buffer) {
        var n =  padLength(buffer.tell());
        buffer.seek(buffer.tell() + n);
    }

    function getObjectFromArray (A) {
        var obj = {}, i;
        for (i = 0; i < A.length; i++) {
            if(A[i] !== undefined) {
                obj[A[i].name] = A[i];
            }
        }
        return obj;
    }

    return {
        NC_ABSENT : 0,
        NC_DIMENSION : 10,
        NC_VARIABLE : 11,
        NC_ATTRIBUTE : 12,
        NC_UNLIMITED : 0,
        NC_MAGIC: 'CDF',
        NC_32BIT: '\x01',
        NC_64BIT: '\x02',
        numberType: types.int32,
        padLength: padLength,
        padSkip: padSkip,
        padBuffer: padBuffer,
        getByName: function (A, name) {
            var i;
            for (i = 0; i < A.length; i++) {
                if (A[i] !== undefined && A[i].name === name) { return A[i]; }
            }
            return undefined;
        },
        getNameArray: function (A) {
            var i, names = [];
            for (i = 0; i < A.length; i++) {
                if (A[i] !== undefined) { names.push(A[i].name); }
            }
            return names;
        },
        popNameArray: function (A, name) {
            var i;
            for (i = 0; i < A.length; i++) {
                if(A[i] !== undefined && A[i].name === name) {
                    return A.splice(i, 1)[0];
                }
            }
            return undefined;
        },
        getObjectFromArray: getObjectFromArray,
        writeArray: function (buffer, type, arr) {
            buffer.write(types.int32, arr.length);
            buffer.write(type, arr);
            padBuffer(buffer);
        },
        writeArraySize: function (type, arr) {
            var n = types.int32.size + type.size * arr.length;
            return n + padLength(n);
        },
        readArray: function (buffer, type) {
            var n = buffer.read(types.int32), value;
            value = buffer.read(type, n);
            padSkip(buffer);
            return value;
        },
        readType: function (buffer) {
            var id = buffer.read(types.int32);
            var typeName, type;
            for (typeName in types) {
                if(types.hasOwnProperty(typeName)) {
                    type = types[typeName];
                    if (type.id === id) {
                        return type;
                    }
                }
            }
            throw new Error("Invalid type read from buffer: " + id.toString());
        }
    };
});
