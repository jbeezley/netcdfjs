
/*jshint forin: false */
'use strict';

var common = require('./common'), types = require('./types'), Attribute = require('./attribute');
var dP = common.dP;

function Variable(typeName, dnames, getDim, getNRecs, fill) {
    var type;
    var attrs = [];
    var anames = [];
    var that = this;
    
    if (dnames === undefined) { dnames = []; }
    if (typeof typeName === 'string') { type = types[typeName]; }
    else { type = typeName; }

    function getAttr(name) {
        return common.getValue(anames, attrs, name);
    }

    dP(this, 'type', { enumerable: true, get: function () { return type.toString(); }});
    dP(this, 'attributes', { enumerable: true, get: function () {
        return common.getObj(anames, attrs);
    }});
    dP(this, 'dimensions', { enumerable: true, get: function () {
        return dnames.slice();
    }});
    dP(this, 'createAttribute', { value: function (name, type) {
        var a;
        if (getAttr(name) !== undefined) {
            throw new Error("Duplicate attribute name");
        }
        if (type.constructor === Attribute) {
            a = type;
        } else {
            a = new Attribute(type);
        }
        anames.push(name);
        attrs.push(a);
        return a;
    }});
    dP(this, 'unlimited', { get: function () {
        return that.nDims > 0 && getDim(dnames[0]).unlimited;

    }});
    dP(this, 'nDims', { get: function () {
        return dnames.length;
    }});
    dP(this, 'shape', { get: function () {
        var shp = [], i;
        for (i = 0; i < that.nDims; i++) {
            shp.push(getDim(dnames[i]).size);
        }
        if (that.unlimited) { shp[0] = getNRecs(); }
        return shp;
    }});
    dP(this, 'toString', { value: function () {
        return type.cdlType + ' (' + that.shape.join(', ') + ')';
    }});
    if (fill !== undefined) {
        this.createAttribute('_FillValue', type.toString()).set(fill);
    }
}

module.exports = Variable;
