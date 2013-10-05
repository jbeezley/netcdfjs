// javascript implementation of netcdf3 format described here:
// http://www.unidata.ucar.edu/software/netcdf/docs/netcdf/File-Format-Specification.html

/*
 * The MIT License (MIT)
 * Copyright © 2013 Jonathan Beezley, jon.beezley@gmail.com
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the “Software”), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 * 
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED “AS IS”, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
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

define(function () {
    'use strict';

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
        dP, formats, numberSize, cdlMap, numberType,
        TWO_32 = Math.pow(2, 32), typeChar;

    formats = { NETCDF3_CLASSIC: '\x01', NETCDF3_64BIT: '\x02' };
    Object.freeze(formats);

    // type mapping from netcdf definition to jbinary types
    typeMap[NC_BYTE]   = 'int8';
    typeMap[NC_CHAR]   = 'char';
    typeMap[NC_SHORT]  = 'int16';
    typeMap[NC_INT]    = 'int32';
    typeMap[NC_FLOAT]  = 'float32';
    typeMap[NC_DOUBLE] = 'float64';
    numberType = 'int32';

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
    numberSize = sizeMap.int32;

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

    // aliases to reduce source size
    dP = Object.defineProperty;

    // simple dataview wrapper based in part on jdataview
    function wrapDataView(buffer) {
        var index = 0, d = [];
        this.tell = function () {
            return index;
        };
        this.seek = function (offset) {
            if (offset) {
                index = offset
            } else {
                index = 0;
            }
        };
        this.debugString = function () {
            return d.join(" ");
        }
        this._write = function (type, value) {
            var hi, lo;
            //console.log(type, value, index);
            d.push(value.toString());
            if (type === 'int8') {
                buffer.setInt8(index, value);
                index += 1;
            } else if (type === 'char') {
                buffer.setUint8(index, value.charCodeAt(0));
                index += 1;
            } else if (type === 'int16') {
                buffer.setInt16(index, value);
                index += 2;
            } else if (type === 'int32') {
                buffer.setInt32(index, value);
                index += 4;
            } else if (type === 'int64') {
                hi = Math.floor(value / TWO_32);
                lo = value - hi * TWO_32;
                if (value < 0) {
                    hi += TWO_32;
                }
                buffer.setInt32(index, hi);
                index += 4;
                buffer.setUint32(index, lo);
                index += 4;
            } else if (type === 'float32') {
                buffer.setFloat32(index, value);
                index += 4;
            } else if (type === 'float64') {
                buffer.setFloat64(index, value);
                index += 8;
            }
        };
        this.write = function (type, value) {
            var i;
            if (Array.isArray(value) || type === 'char') {
                for (i = 0; i < value.length; i++) {
                    this._write(type, value[i]);
                }
            } else {
                this._write(type, value);
            }
        }
        this._read = function (type) {
            var value, hi;
            if (type === 'int8') {
                value = buffer.getInt8(index);
                index += 1;
            } else if (type === 'char') {
                value = String.fromCharCode(buffer.getUint8(index));
                index += 1;
            } else if (type === 'int16') {
                value = buffer.getInt16(index);
                index += 2;
            } else if (type === 'int32') {
                value = buffer.getInt32(index);
                index += 4;
            } else if (type === 'int64') {
                value = buffer.getInt32(index);
                index += 4;
                hi = 0;
                if (value) {
                    // warn on precision loss
                    console.log("WARNING: converting 64 bit integer into a double.");
                    hi = TWO_32 * value;
                }
                value = hi + buffer.getUint32(index);
                index += 4;
            } else if (type === 'float32') {
                value = buffer.getFloat32(index);
                index += 4;
            } else if (type === 'float64') {
                value = buffer.getFloat64(index);
                index += 8;
            }
            return value;
        };
        this.read = function (type, size) {
            var i, size, value;
            if (size !== undefined) {
                value = [];
                for (i = 0; i < size; i++) {
                    value.push(this._read(type));
                }
                if (type === 'char') {
                    value = value.join("");
                }
            } else {
                value = this._read(type);
            }
            return value;
        }
    }

    function padLength(n) {
        // get the number of bytes of padding needed for an object of size n
        return (4 - (n % 4)) % 4;
    }

    function padBuffer(buffer) {
        var i, n = padLength(buffer.tell());
        for (i = 0; i < n; i++) {
            buffer.write('int8',0);
        }
    }

    function stringSize(s) {
        // return the number of bytes required to store a given string
        // format:
        //   length + string + padding
        // (strings are padded to 32 bit boundaries)
        return numberSize + s.length + padLength(s.length);
    }

    function writeString(s, buffer) {
        // write the string s to the buffer
        buffer.write(numberType, s.length);
        buffer.write('char', s);
        padBuffer(buffer);
    }

    // simple ordered mapping container
    // (also protects against keys conflicting with methods)
    function OMap (valueCheck) {
        var keys = [], values = [];
        // optional argument checks values added to the mapping, which
        // by default returns true.
        if (valueCheck === undefined) {
            valueCheck = function () { return true; };
        }
        function copyArray(a) { return Array.prototype.slice.call(a); };
        dP(this, "append", {
            //__proto__: null,
            value: function (key, value) {
                if (typeof key !== "string") {
                    throw new TypeError("Mapped keys must be strings.");
                }
                if (keys.indexOf(key) >= 0) {
                    throw new Error ("Duplicate key.");
                }
                if (typeof value === "string" || typeof value === "number" || !valueCheck(value)) {
                    throw new TypeError("Invalid value.");
                }
                keys.push(key);
                values.push(value);
                return this;
            }
        });
        dP(this, "indexOf", {
            //__proto__: null,
            value: function (key) {
                var index;
                if (typeof key === "string") {
                    index = keys.indexOf(key);
                } else if ( typeof key === "number" ) {
                    index = key;
                } else {
                    index = values.indexOf(key);
                }
                return index;
            }
        });
        dP(this, "keyOf", {
            //__proto__: null,
            value: function (value) {
                var index;
                if (typeof value === "string") {
                    index = keys.indexOf(value);
                } else if ( typeof value === "number" ) {
                    index = value;
                } else {
                    index = values.indexOf(value);
                }
                return keys[index];
            }
        });
        dP(this, "remove", {
            //__proto__: null,
            value: function (key) {
                var index = this.indexOf(key);
                if (index < 0) {
                    throw new Error("Invalid key.");
                }
                keys.splice(index, 1);
                values.splice(index, 1);
            return this;
            }
        });
        dP(this, "length", {
            //__proto__: null,
            get: function () { return keys.length; }
        });
        dP(this, "get", {
            //__proto__: null,
            value: function (key) {
                return values[this.indexOf(key)];
            }
        });
        dP(this, "keys", {
            //__proto__: null,
            get: function () { return copyArray(keys); }
        });
        dP(this, "values", {
            //__proto__: null,
            get: function () { return copyArray(values); }
        });
        this.toLines = function (tab) {
            var s = [], i;
            if (tab === undefined) {
                tab = ''
            }
            for (i = 0; i < this.length; i++) {
                s.push(tab + keys[i].toString() + " = " + values[i].toString() + " ;");
            }
            return s;
        };
        this.keysToLines = function (tab) {
            var s = [], i;
            if (tab === undefined) {
                tab = ''
            }
            for (i = 0; i < this.length; i++) {
                s.push(tab + keys[i].toString());
            }
            return s;
        };
        this.valuesToLines = function (tab) {
            var s = [], i;
            if (tab === undefined) {
                tab = ''
            }
            for (i = 0; i < this.length; i++) {
                s.push(values[i].toString(tab));
            }
            return s;
        }
        this.toString = function (tab) {
            return this.toLines(tab).join("\n");
        };
        this.toObject = function () {
            var obj = {}, i;
            for (i = 0; i < this.length; i++) {
                obj[this.keys[i]] = this.values[i];
            }
            return obj;
        }
        this.headerSize = function (offset) {
            // compute the size of this element of the header
            // given an offset size (depending on the file type)
            var n = numberSize, // absent or type
                i;
            n += numberSize; // length
            for (i = 0; i < this.length; i++) {
                n += stringSize(keys[i]);
                n += values[i].headerSize(offset);
            }
            return n;
        };
        this.writeHeader = function (buffer, offset, offsets) {
            var i, id = this._id;
            if (id === undefined) {
                throw new Error("writeHeader called in abstract class.");
            }
            if (offsets === undefined) {
                offsets = [];
            }
            if (this.length) {
                buffer.write(numberType, id);
                buffer.write(numberType, this.length);
                for (i = 0; i < this.length; i++) {
                    writeString(this.keys[i], buffer);
                    this.values[i].writeHeader(buffer, offset, offsets[i]);
                }
            } else {
                buffer.write(numberType, ABSENT);
            }
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

    function Variable (type, dimensions, fill_value) {
        var attr, attrs = AttributeMap();
        makeTypedObject(this, type);
        dP(this, "dimensions", { value: dimensions.keys });
        dP(this, "attributes", { get: function () { return attrs.toObject(); } });
        dP(this, "shape", { get: function () {
                var i, s = [];
                for (i = 0; i < dimensions.length; i++) {
                    s.push(dimensions.currentSize);
                }
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
            } else {
                throw new Error("Invalid offset size.");
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

    function DimensionMap() {
        var dmap = new OMap(checkDimension);
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

    function NcFile (format) {
        var attrs = AttributeMap(),
            vars = VariableMap(),
            dims = DimensionMap();
        if (format === undefined) {
            format = 'NETCDF3_CLASSIC';
        }
        format = formats[format];
        if ( format === undefined ) {
            throw new Error("Invalid file format.");
        }
        dP(this, "offsets", { get: function () {
            var o = [], v, n, i;
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
        this.createVariable = function (name, type, dimensions, fill_value) {
            var i, v, dimName, dim,
                vdims = DimensionMap();
            if (vars.get(name) !== undefined) {
                throw new Error(["Variable name already exists: ", name].join(""));
            }
            for (i = 0; i < dimensions.length; i++) {
                dimName = dimensions[i];
                dim = dims.get(dimName);
                if (dim === undefined) {
                    throw new Error(["Undefined dimension: ", dimName].join(""));
                }
                if (i !== 0 && dim.size === undefined) {
                    throw new Error("Only the first dimension can be unlimited.")
                }
                vdims.append(dimName, dim);
            }
            v = new Variable(type, vdims, fill_value);
            vars.append(name, v);
            return v;
        };
        this.createDimension = function (name, size) {
            var dim = new Dimension(size, dims.length, size === undefined);
            if (dims.get(name) !== undefined) {
                throw new Error(["Dimension name already exists: ", name].join(""));
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
            console.log(offsets.join(" "));
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
            console.log(buffer.debugString());
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
    }

    return { NcFile: NcFile, types: Object.keys(invTypeMap), fileFormats: formats };
});