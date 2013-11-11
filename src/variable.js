
/*jshint forin: false */
/*global define*/
(function (root, factory) {
    'use strict';

    if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define(['common', 'types', 'attribute'], factory);
    } else if (typeof exports === 'object') {
        // Node. Does not work with strict CommonJS, but
        // only CommonJS-like enviroments that support module.exports,
        // like Node.
        module.exports = factory(require('common'), require('types'), require('attribute'));
    } else {
        // Browser globals (root is window)
        root.returnExports = factory(root.common, root.types, root.attribute);
    }
}(this, function (common, types, Attribute) {
    'use strict';

    var dP = common.dP;

    function Variable(typeName, dnames, getDimid, getDim, getNRecs, fill) {
        var type = types[typeName];
        var attrs = [];
        var anames = [];
        var that = this;
        
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
        dP(this, 'attributes', { get: function () {
            return common.getObj(anames, attrs);
        }});
        dP(this, 'dimensions', { get: function () {
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
            a = new Attribute(type);
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

    return Variable;
}));
