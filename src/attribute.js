
'use strict';

var common = require('./common'), types = require('./types');
var dP = common.dP;

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
    dP(this, 'toString', { value: function () {
        return type.toString(values);
    }});
    Object.freeze(this);
}
dP(Attribute, 'fromObject', { value: function (obj) {
    var attr = new Attribute(obj.type);
    if (obj.hasOwnProperty('values')) {
        attr.set(obj.values);
    }
    return attr;
}});

module.exports = Attribute;
