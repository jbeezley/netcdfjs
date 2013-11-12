
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
    dP: Object.defineProperty
};
