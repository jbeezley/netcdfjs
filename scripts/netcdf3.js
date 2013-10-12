// javascript implementation of netcdf3 format described here:
// http://www.unidata.ucar.edu/software/netcdf/docs/netcdf/File-Format-Specification.html

/*
 * The MIT License (MIT)
 * Copyright © 2013 Jonathan Beezley, jon.beezley@gmail.com
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the ÒSoftwareÓ), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 * 
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED ÒAS ISÓ, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

// This module contains a class object NcFile which resembles the netCDF4.Dataset
// python class as closely as possible.

if (typeof define !== 'function') {
    var define = require('amdefine')(module);
}

define(['./wrapdataview.js', './orderedmap.js', './common.js'], function (wrapDataView, OMap, common) {
    'use strict';

    var dP = common.dP, numberSize = common.numberSize, numberType = common.numberType,
        padLength = common.padLength, padBuffer = common.padBuffer,
        stringSize = common.stringSize, writeString = common.writeString,
        padSkip = common.padSkip;
    
    // Constants defined by the netcdf specification:
    var ABSENT       = [0, 0],
        NC_BYTE      = 1,
        NC_CHAR      = 2,
        NC_SHORT     = 3,
        NC_INT       = 4,
        NC_FLOAT     = 5,
        NC_DOUBLE    = 6,
        NC_DIMENSION = 10,
        NC_VARIABLE  = 11,
        NC_ATTRIBUTE = 12,
        typeMap = {},
        invTypeMap = {},
        typekey,
        sizeMap,
        typeFill,
        formats, cdlMap,
        typeChar;

    formats = { NETCDF3_CLASSIC: '\x01', NETCDF3_64BIT: '\x02' };
    Object.freeze(formats);

    // type mapping from netcdf definition to jbinary types
    typeMap[NC_BYTE]   = 'int8';
    typeMap[NC_CHAR]   = 'char';
    typeMap[NC_SHORT]  = 'int16';
    typeMap[NC_INT]    = 'int32';
    typeMap[NC_FLOAT]  = 'float32';
    typeMap[NC_DOUBLE] = 'float64';

    // mapping for cdl names
    cdlMap = {
        int8: 'byte',
        char: 'char',
        int16: 'short',
        int32: 'int',
        float32: 'float',
        float64: 'double',
    };

    // sizes of basic types in bytes
    sizeMap = {
        int8:    1,
        char:    1,
        int16:   2,
        int32:   4,
        float32: 4,
        float64: 8
    };

    typeChar = {
        int8: 'b',
        char: '',
        int16: 's',
        int32: '',
        float32: 'f',
        float64: ''
    };

    // default fill values from netcdf library
    typeFill = {
        int8:    "\x81",
        char:    "\x00",
        int16:   "\x80\x01",
        int32:   "\x80\x00\x00\x01",
        float32: "\x7C\xF0\x00\x00",
        float64: "\x47\x9E\x00\x00\x00\x00\x00\x00"
    }

    // inverse mapping of typeMap
    for (typekey in typeMap) {
        if (typeMap.hasOwnProperty(typekey)) {
            invTypeMap[typeMap[typekey]] = (+typekey);
        }
    }

    function makeTypedObject (obj, type) {
        if (!(invTypeMap.hasOwnProperty(type))) {
            throw new Error("Invalid type " + type.toString());
        }
        dP(obj, "type", { value: type });
        dP(obj, "itemsize", { value: sizeMap[type] });
        dP(obj, "nctype", { value: invTypeMap[type] });
        if (type === "char" && obj.constructor === Array) {
            obj.toString = function () { return this.join(""); };
            obj.valueOf = function () { return this.join(""); };
        }
    }

    function Dimension (size, id, unlimited) {
        if (!(unlimited || size > 0)) {
            throw new Error("Invalid dimension size.");
        }
        if (unlimited) {
            size = "UNLIMITED";
            dP(this, "currentSize", {
                value: 0,
                writable: true
            });
        } else {
            dP(this, "currentSize", {
                value: size,
                writable: false
            });
        }
        dP(this, "size", { value: size });
        dP(this, "unlimited", { value: !!unlimited });
        dP(this, "id", { value: id });
        this.valueOf = function () {return this.currentSize;};
        this.toString = function () {return this.size;};
        this.headerSize = function () {
            return numberSize;
        };
        this.writeHeader = function (buffer) {
            if (unlimited) {
                buffer.write(numberType, 0);
            } else {
                buffer.write(numberType, size);
            }
        };
    }
    Dimension.readHeader = function (buffer, id, recsize) {
        var size = buffer.read(numberType), dim;
        dim = new Dimension(size, id, size === 0);
        if (dim.unlimited) {
            dim.currentSize = recsize;
        }
        Object.freeze(dim);
        return dim;
    }

    function Attribute (type) {
        var me = Object.create(Array.prototype);
        me = (Array.apply( me, [] ) || me);
        makeTypedObject(me, type);
        me.toString = function () {
            var s = [], i, vals = [];
            
            if (type === "char") {
                s.push('"' + this.join("") + '"');
            } else if (this.length === 1) {
                s.push(this[0].toString() + typeChar[type]);
            } else {
                //s.push("[ ")
                for (i = 0; i < this.length; i++) {
                    vals.push(this[i].toString() + typeChar[type]);
                }
                s.push(vals.join(", "));
                //s.push(" ]");
            }
            return s.join("");
        };
        me.headerSize = function () {
            // format:
            //   type length [values ...]
            var n = 2 * numberSize + me.length * sizeMap[type];
            return n + padLength(n);
        };
        me.writeHeader = function (buffer) {
            buffer.write(numberType, invTypeMap[type]);
            buffer.write(numberType, me.length);
            buffer.write(type, me);
            padBuffer(buffer);
        };
        return me;
    }
    Attribute.readHeader = function (buffer) {
        var type, n, val, attr, i;
        type = typeMap[buffer.read(numberType)];
        n = buffer.read(numberType);
        val = buffer.read(type, n);
        attr = new Attribute(type);
        for (i = 0; i < n; i++) {
            attr[i] = val[i];
        }
        padSkip(buffer);
        Object.freeze(attr);
        return attr;
    }
    
    function createAttribute(value, type) {
        // create an attribute, where value can be:
        //   a number
        //   a string
        //   an array of numbers
        //   an array of characters
        // type is an optional argument to specify the
        // numeric type of the value(s), if the values
        // are strings, then the type must be 'string' or
        // undefined.
        var v, t, attr, i;
        function toArray(s) {
            // turn a string into an array of chars
            var a = [];
            for (i = 0; i < s.length; i++) {
                a[i] = s[i];
            }
            return a;
        }
        if (Array.isArray(value)) {
            if (value.length) {
                v = value[0];
                if (typeof v === 'string') {
                    t = 'char';
                } else if (typeof v === 'number') {
                    t = 'float64';
                } else {
                    throw new Error("Could not determine type of: " + v);
                }
            } else {
                throw new Error("Can not determine the type from an empty array.")
            }
            v = value;
        } else {
            if (typeof value === 'string') {
                t = 'char';
                v = toArray(value);
            } else if (typeof value === 'number') {
                t = 'float64';
                v = [value];
            } else {
                throw new Error("Could not determine type of: " + value);
            }   
        }
        // default to the numeric type of the caller if present
        if (t === 'float64') {
            t = type || t;
        } else if (type !== undefined && t !== type) {
            throw new Error("Invalid type given for values.")
        }
        attr = new Attribute(t);
        for (i = 0; i < v.length; i++) {
            attr[i] = v[i];
        }
        return attr;
    }

    // support functions for type checking
    // (should probably redesign classes to check prototypes,
    //  but this works for now)
    function checkTypedObject(value) {
        // check necessary properties for typed objects
        var type = value.type;
        return (
            invTypeMap.hasOwnProperty(type) &&
            sizeMap[type] === value.itemsize    &&
            invTypeMap[type] === value.nctype
        );
    }

    function checkAttribute(value) {
        // check necessary properties for attribute objects
        return (
            checkTypedObject(value) &&
            Array.isArray(value)
        );
    }

    function checkDimension(value) {
        return value.constructor === Dimension;
    }

    function AttributeMap() {
        var amap = new OMap(checkAttribute);
        dP(amap, "_id", { value: NC_ATTRIBUTE });
        amap.toLines = function (tab) {
            var i, s = [], k, v;
            if (tab === undefined) {
                tab = '';
            }
            for (i = 0; i < this.length; i++) {
                k = this.keys[i];
                v = this.values[i];
                s.push(tab + ":" + k.toString() + " = " + v.toString(tab) + " ;");
            }
            return s;
        };
        amap.toString = function (tab) {
            return this.toLines(tab).join("\n");
        }
        return amap;
    }
    AttributeMap.readHeader = function (buffer) {
        var i, amap, obj = OMap.readHeader(buffer, Attribute.readHeader);
        amap = new AttributeMap();
        for (i = 0; i < obj.keys.length; i++) {
            amap.append(obj.keys[i], obj.values[i]);
        }
        Object.freeze(amap);
        return amap;
    };

    function Variable (type, dimensions, fill_value, getOffset) {
        var attr, attrs = AttributeMap(), offset;
        makeTypedObject(this, type);
        dP(this, "dimensions", { value: dimensions.keys });
        dP(this, "attributes", { get: function () { return attrs.toObject(); } });
        dP(this, "shape", { get: function () {
                var i, s = [];
                for (i = 0; i < dimensions.length; i++) {
                    s.push(dimensions.values[i].currentSize);
                }
                return s;
            }
        })
        dP(this, "size", { get: function () {
                var i, n = 1;
                for (i = 0; i < dimensions.length; i++) {
                    n *= dimensions.values[i].currentSize;
                }
                return n;
            }
        });
        dP(this, "isRecordVariable", { get: function () {
            var b = false, i;
            for (i = 0; i < dimensions.length; i++) {
                if (dimensions.values[i].unlimited) {
                    b = true;
                }
            }
            return ( (!!dimensions.length) && (dimensions.values[0].unlimited) );
        }});
        if (fill_value === undefined) {
            // using default fill value, don't add attribute
            fill_value = typeFill[type];
        } else if (fill_value === false) {
            // do nothing
        } else {
            // over-riding the fill value set _FillValue attribute
            attr = new Attribute(type);
            attr[0] = fill_value;
            attrs.append("_FillValue", attr);
        }
        dP(this, "fill_value", { value: fill_value });
        dP(this, "recsize", { get: function () {
            var n = 1, i;
            for (i = 0; i < dimensions.length; i++) {
                if (!dimensions.values[i].unlimited) {
                    n *= dimensions.values[i].size;
                }
            }
            n *= sizeMap[type];
            n += padLength(n);
            return n;
        }});
        this.toString = function (name, tab) {
            var ltab = tab;
            if (name === undefined) {
                name = ""
            }
            if (tab === undefined) {
                tab = "";
                ltab = "\t"
            }
            var s = [];
            s.push(tab + cdlMap[this.type] + " " + name + "(" + dimensions.keys.join(", ") + ") ;");
            if (attrs.length) {
                s.push(attrs.toLines(tab + ltab + name).join("\n"));
            }
            return s.join("\n");
        };
        this.createAttribute = function (name, value, type) {
            var attr = createAttribute(value, type);
            attrs.append(name, attr);
            return attr;
        };
        this.headerSize = function (offset) {
            // format:
            //   ndims [dimid ... ] attrs type size begin
            return numberSize // ndims
                   + dimensions.length * numberSize // [dimid ...]
                   + attrs.headerSize(offset) // attrs
                   + numberSize * 2 + offset; // type size begin
        };
        this.writeHeader = function (buffer, offsetSize, offset) {
            var o, i;
            if (offsetSize === 4) {
                o = 'int32';
            } else if (offsetSize === 8) {
                o = 'int64';
            } 
            buffer.write(numberType, dimensions.length);

            for (i = 0; i < dimensions.length; i++) {
                buffer.write(numberType, dimensions.values[i].id);
            }

            attrs.writeHeader(buffer);
            //console.log("type: " + buffer.tell() + " " + invTypeMap[type]);
            buffer.write(numberType, invTypeMap[type]);
            //console.log("size: " + buffer.tell() + " " + n);
            buffer.write(numberType, this.recsize);
            //console.log("offset: " + buffer.tell() + " " + 0);
            buffer.write(o, offset);  
            //console.log("final: " + buffer.tell());
        };
        this.read = function (start, count) {
            var A, size, i, offset = getOffset();
            if (start === undefined) {
                start = []
                for (i = 0; i < dimensions.length; i++) {
                    start.push(0);
                }
            }
            if (count === undefined) {
                count = this.shape;
            }
            size = count.reduce(function (a,b) { return a*b; });
            A = new ArrayBuffer(size * sizeMap[type]);
            return A;
        }
    }
    Variable.readHeader = function (buffer, offsetType, dimensions) {
        var i, nDims, dimids, type, recsize, offset, attrs, v, fill, dims = new DimensionMap(true);
        nDims = buffer.read(numberType);
        dimids = buffer.read(numberType, nDims);
        attrs = AttributeMap.readHeader(buffer);
        type = typeMap[buffer.read(numberType)];
        recsize = buffer.read(numberType);
        offset = buffer.read(offsetType);
        
        fill = undefined;
        if (attrs.indexOf('_FillValue') >= 0) {
            fill = attrs.get('_FillValue')[0];
            attrs.remove('_FillValue');
        }
        for (i = 0; i < nDims; i++) {
            dims.append(dimensions.keys[dimids[i]], dimensions.values[dimids[i]]);
        }
        v = new Variable(type, dims, fill);
        for (i = 0; i < attrs.length; i++) {
            v.createAttribute(attrs.keys[i], attrs.values[i], attrs.values[i].type);
        }
        dP(v, 'offset' , { value: offset });
        Object.freeze(v);
        return v;
    }

    function checkVariable(value) {
        // check necessary properties for variable objects
        return value.constructor === Variable;
    }

    function VariableMap() {
        var vmap = new OMap(checkVariable);
        dP(vmap, "_id", { value: NC_VARIABLE });
        vmap.toString = function (tab) {
            var i, s = [], k, v;
            for (i = 0; i < this.length; i++) {
                k = this.keys[i];
                v = this.values[i];
                s.push(v.toString(k, tab));
            }
            return s.join("\n");
        };
        return vmap;
    }
    VariableMap.readHeader = function (buffer, offset, dimensions) {
        var i, vmap, obj, read;
        function read(b) { return Variable.readHeader(b, offset, dimensions); }
        obj = OMap.readHeader(buffer, read);
        vmap = new VariableMap();
        for (i = 0; i < obj.keys.length; i++) {
            vmap.append(obj.keys[i], obj.values[i]);
        }
        Object.freeze(vmap);
        return vmap;
    };

    function DimensionMap(allowDup) {
        var dmap = new OMap(checkDimension, allowDup);
        dP(dmap, "_id", { value: NC_DIMENSION });
        dmap.toString = function (tab) {
            var s = dmap.toLines(tab), i;
            for (i = 0; i < this.length; i++) {
                if (this.values[i].unlimited) {
                    s[i] = s[i] + " // (" + this.values[i].currentSize.toString() + " currently)";
                }
            }
            return s.join("\n");
        }
        return dmap;
    }
    DimensionMap.readHeader = function (buffer, numrecs) {
        var i, dmap, obj;
        function read(b, id) { return Dimension.readHeader(b, id, numrecs); }
        obj = OMap.readHeader(buffer, read);
        dmap = new DimensionMap();
        for (i = 0; i < obj.keys.length; i++) {
            dmap.append(obj.keys[i], obj.values[i]);
        }
        Object.freeze(dmap);
        return dmap;
    }
    
    function NcFile (format, fmt, argdims, argattrs, argvars) {
        var attrs = AttributeMap(),
            vars = VariableMap(),
            dims = DimensionMap(),
            readwrite = 'w', sfmt;
        if (format === undefined) {
            format = 'NETCDF3_CLASSIC';
        } else if (format === 'FROM_READHEADER') {
            format = fmt;
            dims = argdims;
            attrs = argattrs;
            vars = argvars;
            readwrite = 'r';
        }
        sfmt = format;
        format = formats[sfmt];
        if ( format === undefined ) {
            throw new Error("Invalid file format.");
        }
        dP(this, "offsets", { get: function () {
            var o = [], v, n, i;
            if (readwrite === 'w') {
                n = this.headerSize();
                // loop through non-record variables
                for (i = 0; i < vars.length; i++) {
                    v = vars.values[i];
                    if (!v.isRecordVariable) {
                        o[i] = n;
                        n += v.recsize;
                    }
                }
                // loop through record variables
                for (i = 0; i < vars.length; i++) {
                    v = vars.values[i];
                    if (v.isRecordVariable) {
                        o[i] = n;
                        n += v.recsize;
                    }
                }
            } else if (readwrite === 'r') {
                for (i = 0; i < vars.length; i++) {
                    o[i] = vars.values[i].offset;
                }
            }
            return o;
        }});
        dP(this, "numrecs", { get: function () {
            var i, d;
            for (i = 0; i < dims.length; i++) {
                d = dims.values[i];
                if (d.unlimited) {
                    return d.currentSize;
                }
            }
            return 0;
        }});
        dP(this, "source", { value: undefined });
        dP(this, "attributes", { get: function () { return attrs.toObject(); } });
        dP(this, "dimensions", { get: function () { return dims.toObject(); } });
        dP(this, "variables", { get: function () { return vars.toObject(); } });
        this.toString = function (name) {
            var s = [];
            if (name === undefined) {
                name = '<file>';
            }
            s.push("netcdf " + name + " {");
            s.push("dimensions:");
            s.push(dims.toString("\t"));
            s.push("variables:");
            s.push(vars.toString("\t"));
            s.push("\n// global attributes:");
            s.push(attrs.toString("\t\t"));
            s.push("}");
            return s.join("\n");
        };
        this.copy = function (fmt) {
            return new NcFile('FROM_READHEADER', fmt || sfmt, dims, attrs, vars);
        };
        if (readwrite === 'w') {
            this.createVariable = function (name, type, dimensions, fill_value) {
                var i, v, dimName, dim,
                    vdims = DimensionMap(true), getOffset, that = this;
                if (typeof name !== 'string' || !name.length ) {
                    throw new Error("Invalid variable name.")
                }
                if (vars.get(name) !== undefined) {
                    throw new Error(["Variable name already exists: ", name].join(""));
                }
                for (i = 0; i < dimensions.length; i++) {
                    dimName = dimensions[i];
                    dim = dims.get(dimName);
                    if (dim === undefined) {
                        throw new Error(["Undefined dimension: ", dimName].join(""));
                    }
                    if (i !== 0 && dim.unlimited) {
                        throw new Error("Only the first dimension can be unlimited.")
                    }
                    vdims.append(dimName, dim);
                }
                getOffset = function () {
                    var off = that.offsets, ivar = vars.indexOf(name);
                    return off[ivar];
                }
                v = new Variable(type, vdims, fill_value, getOffset);
                vars.append(name, v);
                return v;
            };
            this.createDimension = function (name, size) {
                var dim = new Dimension(size, dims.length, size === undefined), i;
                if (typeof name !== 'string' || !name.length ) {
                    throw new Error("Invalid dimension name.")
                }
                if (dims.get(name) !== undefined) {
                    throw new Error(["Dimension name already exists: ", name].join(""));
                }
                if (dim.unlimited) {
                    for (i = 0; i < dims.length; i++) {
                        if (dims.get(i).unlimited) {
                            throw new Error("Only one unlimited dimension is allowed.")
                        }
                    }
                }
                dims.append(name, dim);
                return dim;
            };
            this.createAttribute = function (name, value, type) {
                var attr = createAttribute(value, type);
                attrs.append(name, attr);
                return attr;
            };
            this.writeHeader = function (buffer) {
                var offsetSize, n = this.headerSize(), bufarg, offsets = this.offsets;
                //console.log(offsets.join(" "));
                if (buffer === undefined) {
                    buffer = new DataView(new ArrayBuffer(n));
                }
                bufarg = buffer;
                buffer = new wrapDataView(buffer);
    
                if (format === formats.NETCDF3_CLASSIC) {
                    offsetSize = 4;
                } else {
                    offsetSize = 8;
                }
                buffer.write("char", "CDF" + format);
                buffer.write(numberType, this.numrecs);
                dims.writeHeader(buffer);
                attrs.writeHeader(buffer);
                vars.writeHeader(buffer, offsetSize, offsets);
                //console.log(buffer.debugString());
                return bufarg;
            };
            this.headerSize = function () {
                // format:
                //   magic numercs dims attrs vars
                var offset;
                if (format === formats.NETCDF3_CLASSIC) {
                    offset = 4;
                } else {
                    offset = 8;
                }
                return 4 + numberSize
                       + dims.headerSize(offset)
                       + vars.headerSize(offset)
                       + attrs.headerSize(offset);
            };
        } else {
            Object.freeze(this);
        }
    }
    NcFile.readHeader = function (buffer) {
        var formatStr, fmt, offsetType, numrecs, dims, attrs, vars, file;
        buffer = new wrapDataView(buffer);
        formatStr = buffer.read("char", 4);
        if (formatStr.slice(0,3) !== 'CDF' ) {
            throw new Error('Invalid netCDF file.');
        }
        fmt = formatStr.slice(3);
        if (fmt === formats.NETCDF3_CLASSIC) {
            fmt = 'NETCDF3_CLASSIC';
            offsetType = 'int32';
        } else if (format === formats.NETCDF3_64BIT) {
            fmt = 'NETCDF_64BIT';
            offsetType = 'int64';
        } else {
            throw new Error('Unsupport netCDF file format.')
        }
        numrecs = buffer.read(numberType);
        dims = DimensionMap.readHeader(buffer, numrecs);
        attrs = AttributeMap.readHeader(buffer);
        vars = VariableMap.readHeader(buffer, offsetType, dims);
        file = new NcFile('FROM_READHEADER', fmt, dims, attrs, vars);
        return file;
    };
    return { NcFile: NcFile, types: Object.keys(invTypeMap) };
});
