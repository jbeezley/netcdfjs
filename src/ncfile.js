/*jshint forin: false */
'use strict';

var common = require('./common'), types = require('./types'),
    Variable = require('./variable'), Dimension = require('./dimension'),
    Attribute = require('./attribute'), NDArray = require('ndarray');
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
    
    dP(this, 'setNumRecs', { value: function (n) { nRecs = n; } });
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
        return s.join('\n') + '\n';
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
dP(NcFile, 'read', { value: function (buffer, done) {
    function err(msg) {
        throw new Error(msg);
    }
    var view;
    var index = 0;
    var f;
    var str = types.string, nbr = types.int32;
     
    var magic;
    var offsetType;
    var numrecs, recsize = 0;
    var marker;
    var name, size, type;
    var n, i, dims = [], dimids, dnames, j, attrs, v, offset, offsets = {};
    
    function skip() {
        index += (4 - (index % 4)) % 4;
    }
    function read(type, len) {
        var v = type.read(index, view, len);
        if (len === undefined) { len = 1; }
        index += len * type.typeSize;
        skip();
        return v;
    }
    function readA(type) {
        var v = type.readArray(index, view);
        index += nbr.typeSize + v.length * type.typeSize;
        skip();
        return v;
    }
    function readType() {
        var ts = read(nbr);
        if (ts === 1) { return types.int8; }
        else if (ts === 2) { return types.string; }
        else if (ts === 3) { return types.int16; }
        else if (ts === 4) { return types.int32; }
        else if (ts === 5) { return types.float32; }
        else if (ts === 6) { return types.float64; }
        else { err("Invalid type id: " + ts); }
    }
    function readAtts() {
        var n, i, atts = [], type, val, name;
        marker = read(nbr);
        if (marker === 0) {
            if (read(nbr) !== 0) {
                err('Expected 0 after ABSENT attribute marker');
            }
        } else if (marker === 12) {
            n = read(nbr);
            for (i = 0; i < n; i++) {
                name = readA(str);
                type = readType();
                val = readA(type);
                atts.push( { name: name, type: type, val: val } );
            }
        } else {
            err('Expected attribute array');
        }
        return atts;
    }
    function makeRead(v, offset) {
        var i, shp = v.shape, ul = v.unlimited ? 1 : 0;
        var type = types[v.type];
        var nda = [], buffer = [], nBuffer;
        var nvrec, b, n = shp.length - ul;
        function zeros(n) {
            var i, a = [];
            for (i = 0; i < n; i++) { a.push(0); }
            return a;
        }
        function flatten(A) {
            var i, j, k;
            var B, vvvv;
            if (A.length === 0) {
                return new type.typedArray(0);
            }
            var irec = 0, x = zeros(n);
            function inc() {
                var i;
                x[n-1] = x[n-1] + 1;
                for (i = n-1; i >= 1; i--) {
                    if (x[i] === A[0].shape[i]) {
                        x[i] = 0;
                        x[i-1] = x[i-1] + 1;
                    }
                }
                if (x[0] === A[0].shape[0]) {
                    irec++;
                    x = zeros(n);
                }
            }

            B = new type.typedArray( nvrec * A[0].size );
            k = 0;
            for (i = 0; i < A.length; i++) {
                if (x.length) {
                    for (j = 0; j < A[0].size; j++) {
                        vvvv = A[irec].get.apply(A[irec], x);
                        B.set(k++, A[irec].get.apply(A[irec], x));
                        inc();
                    }
                } else {
                    B.set(k++, A[irec].get(0));
                }
            }
            return B;
            
        }

        if (ul) {
            nvrec = numrecs;
            shp = shp.slice(1);
        } else {
            nvrec = 1;
        }
        
        nBuffer = shp.reduce(function (a,b) { return a*b; }, 1);
        for (i = 0; i < nvrec; i++) {
            b = type.wrapView(view, offset + i*recsize, nBuffer * type.typeSize);
            buffer.push(b);
            if (shp.length) {
                nda.push(new NDArray(b, shp));
            } else {
                nda.push(new NDArray(b, [1]));
            }
        }

        function readVar(start, count) {
            var B, C, i, m = n, lo, hi, srec, crec;
            if (start === undefined) {
                start = [];
                start.length = n + ul;
            }
            if (count === undefined) {
                count = [];
                count.length = n + ul;
            }
            if ( start.length !== n + ul|| count.length !== n + ul) {
                throw new Error("Invalid start/count argument length");
            }
            if (ul) {
                srec = start[0];
                crec = count[0];
                start = start.slice(1);
                count = count.slice(1);
            } else {
                srec = 0;
                crec = 1;
            }
            hi = [];
            lo = [];
            B = [];
            if (srec === undefined) { srec = 0; }
            if (crec === undefined) { crec = nvrec; }
            if (srec < 0 ||
                crec < 0 ||
                srec + crec > nvrec) {
                throw new Error("Invalid start/count for record dimension");
            }
            for (i = 0; i < m; i++) {
                if (start[i] === undefined) {
                    start[i] = 0;
                }
                if (count[i] === undefined) {
                    count[i] = shp[i] - start[i];
                }
                lo.push(start[i]);
                hi.push(start[i] + count[i]);
                if (lo[i] < 0 || hi[i] < lo || hi[i] > shp[i]) {
                    throw new Error("Invalid start/count values");
                }
            }
            for (i = 0; i < crec; i++) {
                C = nda[i+srec].lo.apply(nda[i+srec], lo);
                B.push(C.hi.apply(C, hi));
            }
            return flatten(B);
        }
        return readVar;
    }
    
    try {
        f = new NcFile();
        view = common.getDataView(buffer);
        magic = read(str, 4);
    
        if (magic.slice(0,3) !== 'CDF') {
            err('Invalid magic');
        }
        if (magic[3] === '\x01') {
            offsetType = nbr;
        } else if (magic[3] === '\x02') {
            offsetType = types.int64;
        } else {
            err('Invalid version byte');
        }
        numrecs = read(nbr);
        if (numrecs < 0) {
            err('Invalid record size');
        }
        f.setNumRecs(numrecs);
        marker = read(nbr);
        if (marker === 0) {
            if (read(nbr) !== 0) {
                err('Expected 0 after ABSENT dimension marker');
            }
        } else if (marker === 10) {
            n = read(nbr);
            for (i = 0; i < n; i++) {
                name = readA(str);
                size = read(nbr);
                dims.push(name);
                f.createDimension(name, size);
            }
        } else {
            err('Expected a dimension array');
        }

        attrs = readAtts(f);
        for (i = 0; i < attrs.length; i++) {
            f.createAttribute(attrs[i].name, attrs[i].type.toString()).set(attrs[i].val);
        }
        
        marker = read(nbr);
        if (marker === 0) {
            if (read(nbr) !== 0) {
                err('Expected 0 after ABSENT variable marker');
            }
        } else if (marker === 11) {
            n = read(nbr);
            for (i = 0; i < n; i++) {
                name = readA(str);
                dimids = readA(nbr);
                dnames = [];
                for (j = 0; j < dimids.length; j++) {
                    dnames.push(dims[dimids[j]]);
                }
                attrs = readAtts(f);
                type = readType();
                size = read(nbr);
                offset = read(offsetType);
                offsets[name] = offset;
                v = f.createVariable(name, type.toString(), dnames);
                if (v.unlimited) { recsize += size; }
                for (j = 0; j < attrs.length; j++) {
                    v.createAttribute(attrs[j].name, attrs[j].type.toString()).set(attrs[j].val);
                }
                //dP(v, 'read', { value: makeRead(v, offset) });
            }
            for (i in f.variables) {
                offset = offsets[i];
                v = f.variables[i];
                dP(v, 'read', { value: makeRead(v, offset) });
            }
        } else {
            err('Expected variable array');
        }

    } catch(e) {
        done(e.msg || e.toString());
        return;
    }
    done(f);
    
}});

module.exports = NcFile;
