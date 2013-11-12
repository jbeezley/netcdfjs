
'use strict';
var common = require('./common');
var dP = common.dP;

function Dimension(size, getNRecs) {
    var that = this;
    if (size === undefined) { size = 0; }
    if (typeof size !== 'number' || size < 0 || !Number.isFinite(size)) {
        throw new Error("Invalid dimension size: " + size);
    }
    dP(this, 'size', { enumerable: true, value: size });
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
module.exports = Dimension;
