/*jshint forin: false */
'use strict';

var common = require('./common'), types = require('./types'),
    Variable = require('./variable'), Dimension = require('./dimension'),
    Attribute = require('./attribute');
var dP = common.dP;

function NcFile() {
    var dims = [], vars = [];
    var dnames = [], vnames = [];
    var nRecs = 0;
    var gVar = new Variable();

    function getDim(name) {
        return common.getValue(dnames, dims, name);
    }
    function getVar(name) {
        return common.getValue(vnames, vars, name);
    }
    function getNRecs() {
        return nRecs;
    }
    function attrStringList(attrs) {
        var str = [], i;
        for (i in attrs) {
            str.push(i + ' = ' + attrs[i].toString());
        }
        return str;
    }
    function dimString(dims) {
        var str = dims.join(', ');
        if (dims.length > 0) {
            str = '(' + str + ')';
        }
        return str;
    }

    dP(this, 'dimensions', { enumerable: true, get: function () {
        return common.getObj(dnames, dims);
    }});
    dP(this, 'attributes', { enumerable: true, get: function () { return gVar.attributes; } });
    dP(this, 'variables', { enumerable: true, get: function () {
        return common.getObj(vnames, vars);
    }});
    dP(this, 'createDimension', { value: function (name, size) {
        var d;
        if (getDim(name) !== undefined) {
            throw new Error("Duplicate dimension name");
        }
        d = new Dimension(size, getNRecs);
        dnames.push(name);
        dims.push(d);
        return d;
    }});
    dP(this, 'createAttribute', { value: gVar.createAttribute });
    dP(this, 'createVariable', { value: function (name, type, dnames, fill) {
        var v;
        if (getVar(name) !== undefined) {
            throw new Error("Duplicate variable name");
        }
        v = new Variable(type, dnames, getDim, getNRecs, fill);
        vars.push(v);
        vnames.push(name);
        return v;
    }});
    dP(this, 'toString', { value: function (file) {
        var s = [], i, j, dobj, aobj;
        
        if (file === undefined) { file = 'file'; }
        s.push('netcdf ' + file + ' {');
        if (dnames.length > 0) {
            s.push('dimensions:');
            for (i = 0; i < dnames.length; i++) {
                s.push('\t' + dnames[i] + ' = ' + dims[i].toString() + ' ;');
                if (dims[i].unlimited) {
                    s[s.length-1] += ' // (' + getNRecs() + ' currently)';
                }
            }
        }
        if (vnames.length > 0) {
            s.push('variables:');
            for (i = 0; i < vnames.length; i++) {
                dobj = dimString(vars[i].dimensions);
                aobj = attrStringList(vars[i].attributes);
                s.push('\t' + types[vars[i].type].cdlType + ' ' + vnames[i] + dobj + ' ;');
                for (j = 0; j < aobj.length; j++) {
                    s.push('\t\t' + vnames[i] + ':' + aobj[j] + ' ;');
                }
            }
        }
        aobj = attrStringList(gVar.attributes);
        if (aobj.length > 0) {
            s.push('');
            s.push('// global attributes:');
            for (i = 0; i < aobj.length; i++) {
                s.push('\t\t:' + aobj[i] + ' ;');
            }
        }
        s.push('}');
        return s.join('\n');
    }});
}
dP(NcFile, 'fromObject', { value: function (obj) {
    var f = new NcFile(), name, aname, dims, v, vars, attrs;
    if (obj.hasOwnProperty('dimensions')) {
        dims = obj.dimensions;
        for (name in dims) {
            if (dims[name].constructor === Dimension) {
                f.createDimension(name, dims[name].size);
            } else {
                f.createDimension(name, dims[name]);
            }
        }
    }
    if (obj.hasOwnProperty('attributes')) {
        attrs = obj.attributes;
        for (name in attrs) {
            f.createAttribute(name, Attribute.fromObject(attrs[name]));
        }
    }
    if (obj.hasOwnProperty('variables')) {
        vars = obj.variables;
        for (name in vars) {
            v = vars[name];
            f.createVariable(name, v.type, v.dimensions);
            if (v.hasOwnProperty('attributes')) {
                attrs = v.attributes;
                for (aname in v.attributes) {
                    v.createAttribute(aname, Attribute.fromObject(attrs[name]));
                }
            }
        }
    }
    return f;
}});

module.exports = NcFile;
