
/*jshint forin: false */
'use strict';

var common = require('./common'), types = require('./types'), Attribute = require('./attribute');
var dP = common.dP;

function Variable(typeName, dnames, getDimid, getDim, getNRecs, fill) {
    var type;
    var attrs = [];
    var anames = [];
    var that = this;
    
    if (dnames === undefined) { dnames = []; }
    if (typeof typeName === 'string') { type = types[typeName]; }
    else { type = typeName; }

    function getDimids() {
        var i, d, dimids = [];
        for (i = 0; i < that.nDims; i++) {
            d = getDimid(dnames[i]);
            if (d < 0) { throw new Error("Undefined dimension: " + dnames[i]); }
            dimids.push(d);
        }
        return dimids;
    }
    function getAttr(name) {
        return common.getValue(anames, attrs, name);
    }

    dP(this, 'type', { enumerable: true, get: function () { return type.toString(); }});
    dP(this, 'attributes', { enumerable: true, get: function () {
        return common.getObj(anames, attrs);
    }});
    dP(this, 'dimensions', { enumerable: true, get: function () {
        var dims = [], i;
        for (i = 0; i < that.nDims; i++) {
            dims[i] = getDim(dnames[i]);
        }
        return dims;
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
        var d = that.dimensions;
        return d.length > 0 && d[0].unlimited;

    }});
    dP(this, 'nDims', { get: function () {
        return dnames.length;
    }});
    dP(this, 'shape', { get: function () {
        var shp = [], i, dims = that.dimensions;
        for (i = 0; i < that.nDims; i++) {
            shp.push(dims[i].size);
        }
        if (that.unlimited) { shp[0] = getNRecs(); }
        return shp;
    }});
    dP(this, 'toAttrStringList', { value: function () {
        var str = [], i, attrs = that.attributes;
        for (i in attrs) {
            str.push(i  + ' = ' + attrs[i].toString());
        }
        return str;
    }});
    dP(this, 'toStringObj', { value: function () {
        var dims = '';
        if (that.nDims > 0) {
            dims = '(' + dnames.join(', ') + ')';
        }
        return {
            type: type.cdlType,
            dims: dims,
            attrs: that.toAttrStringList()
        };
    }});
    dP(this, 'toString', { value: function () {
        var obj = that.toStringObj();
        return obj.type + ' ' + obj.dims;
    }});
}

module.exports = Variable;
