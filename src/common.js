
'use strict';
function getIndex(A, s) {
    var i;
    for (i = 0; i < A.length; i++) {
        if (A[i] === s) { return i; }
    }
    return -1;
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
        var i, view;
        if (obj.constructor === ArrayBuffer) {
            return new DataView(obj);
        } else if (obj.constructor === DataView) {
            return obj;
        } else if (typeof obj === 'number') {
            return new DataView(new ArrayBuffer(obj));
        } else if (obj.hasOwnProperty('buffer')) {
            return new DataView(obj.buffer);
        } else if (typeof obj.readUInt8 === 'function') {
            view = new DataView(new ArrayBuffer(obj.length));
            for (i = 0; i < obj.length; i++) {
                view.setUint8(i, obj.readUInt8(i));
            }
            return view;
        } else {
            throw new Error("Invalid input parameter");
        }
    },
    dP: Object.defineProperty
};
