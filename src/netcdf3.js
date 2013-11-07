// if the module has no dependencies, the above pattern can be simplified to
/*global define*/
(function (root, factory) {
    'use strict';

    if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define(factory);
    } else if (typeof exports === 'object') {
        // Node. Does not work with strict CommonJS, but
        // only CommonJS-like enviroments that support module.exports,
        // like Node.
        module.exports = factory();
    } else {
        // Browser globals (root is window)
        root.returnExports = factory();
    }
}(this, function () {
    'use strict';
    
    function fileClass() {
        var fs = require('fs');
        function File(fileName, readWrite) {
            this.fileName = fileName;
            if (readWrite === 'r') {
                this.read = function () {
                    var i, nodeBuffer = fs.readFileSync(fileName),
                        n = nodeBuffer.length,
                        buffer = new DataView(new ArrayBuffer());
                    for (i = 0; i < n; i++) {
                        buffer.setUint8(i, nodeBuffer[i]);
                    }
                    return buffer;
                };
            } else if (readWrite === 'w') {
                this.write = function (buffer) {
                    var n = buffer.byteLength, i,
                        nodeBuffer = new NodeBuffer(n);
                    for (i = 0; i < n; i++) {
                        nodeBuffer[i] = buffer.getUint8(i);
                    }
                    fs.writeFileSync(fileName, nodeBuffer);
                };
            }
            Object.freeze(this);
        }
        return File;
    }

    function bufferClass() {
    
        function Buffer(buffer) {
            var index = 0;
            this.tell = function () { return index; };
            this.seek = function (newIndex) { index = newIndex; };
            this.read = function (type, count) {
                var val = type.read(index, buffer, count);
                if (count > 1) {
                    index += count * type.size;
                } else {
                    index += type.size;
                }
                return val;
            };
            this.write = function (type, value) {
                index += type.write(index, buffer, value);
            };
            this.length = buffer.byteLength;
            this.dataView = buffer;
        }
    
        return Buffer;
    }
    
    function typesClass() {
        
        function fmtInt(fmtChar) {
            return function (value) { return value.toString() + fmtChar; };
        }
        
        function fmtFloat(fmtChar) {
            return function (value) {
                if(value.toFixed() === value.toString()) {
                    return value.toFixed(1) + fmtChar;
                } else {
                    return value.toString() + fmtChar;
                }
            };
        }
        
        function fmtString() {
            return function (value) { return '"' + value + '"'; };
        }
    
        function TypeObject(typeName, ncTypeName,
                            ncTypeId, typeSize,
                            fmtFunction, typeFill,
                            cdlName, dataViewType,
                            numeric, decimal, integer, string) {
            var that = this;
            this.type = typeName;
            this.ncType = ncTypeName;
            this.id = ncTypeId;
            this.size = typeSize;
            this.fill = typeFill;
            this.cdlType = cdlName;
            this.toString = function (value) {
                if(value === undefined) {
                    return typeName;
                } else {
                    return fmtFunction(value);
                }
            };
            this.numeric = numeric;
            this.decimal = decimal;
            this.integer = integer;
            this.string = string;
            this.dataViewType = dataViewType;
            this.validate = function (value) {
                if (numeric && typeof(value) !== 'number') {
                    return false;
                } else if (string && typeof(value) !== 'string') {
                    return false;
                } else if (numeric && integer && Number(value.toFixed(0)) !== value) {
                    return false;
                } else if (numeric && value !== value) {
                    return false;
                } else if (numeric && ! Number.isFinite(value)) {
                    return false;
                } else {
                    return true;
                }
            };
            this.read = function (index, buffer, length) {
                var val, i;
                if (length === undefined) {
                    val = buffer['get' + dataViewType](index);
                    if (string) {
                        val = String.fromCharCode(val);
                    }
                } else {
                    val = [];
                    for (i = 0; i < length; i++) {
                        val.push(that.read(index + i*typeSize, buffer));
                    }
                    if (string) {
                        val = val.join('');
                    }
                }
                return val;
            };
            this.write = function (index, buffer, value) {
                var i, n = 0;
                if (typeof(value) === 'string') {
                    for(i = 0; i < value.length; i++) {
                        n++;
                        buffer.setUint8(index + i, value.charCodeAt(i));
                    }
                } else if (Array.isArray(value)) {
                    for(i = 0; i < value.length; i++) {
                        n += typeSize;
                        that.write(index + i*typeSize, buffer, value[i]);
                    }
                } else {
                    n += typeSize;
                    buffer['set' + dataViewType](index, value);
                }
                return n;
            };
            Object.freeze(this);
        }
    
        var types = {
            'char'    : new TypeObject('char', 'NC_CHAR', 2, 1, fmtString(), '\x00', 'char', 'Uint8', false, false, false, true),
            'int8'    : new TypeObject('int8', 'NC_BYTE', 1, 1, fmtInt('b'), '\x81', 'byte', 'Int8', true, false, true, false),
            'int16'   : new TypeObject('int16', 'NC_SHORT', 3, 2, fmtInt('s'), '\x80\x01', 'short', 'Int16', true, false, true, false),
            'int32'   : new TypeObject('int32', 'NC_INT', 4, 4, fmtInt(''), '\x80\x00\x00\x01', 'int', 'Int32', true, false, true, false),
            'float32' : new TypeObject('float32', 'NC_FLOAT', 5, 4, fmtFloat('f'), '\x7C\xF0\x00\x00', 'float', 'Float32', true, true, false, false),
            'float64' : new TypeObject('float64', 'NC_DOUBLE', 6, 8, fmtFloat(''), '\x47\x9E\x00\x00\x00\x00\x00\x00', 'double', 'Float64', true, true, false, false)
        };
    
        Object.freeze(types);
        return types;
    }
    
    function ncDefsClass(types) {
        
        function padLength(n) {
            return (4 - (n % 4)) % 4;
        }
    
        function padBuffer(buffer) {
            var i, n = padLength(buffer.tell());
            for (i = 0; i < n; i++) {
                buffer.write(types.int8, 0);
            }
        }
    
        function padSkip(buffer) {
            var n =  padLength(buffer.tell());
            buffer.seek(buffer.tell() + n);
        }
    
        function getObjectFromArray (A) {
            var obj = {}, i;
            for (i = 0; i < A.length; i++) {
                if(A[i] !== undefined) {
                    obj[A[i].name] = A[i];
                }
            }
            return obj;
        }
    
        return {
            NC_ABSENT : 0,
            NC_DIMENSION : 10,
            NC_VARIABLE : 11,
            NC_ATTRIBUTE : 12,
            NC_UNLIMITED : 0,
            NC_MAGIC: 'CDF',
            NC_32BIT: '\x01',
            NC_64BIT: '\x02',
            numberType: types.int32,
            padLength: padLength,
            padSkip: padSkip,
            padBuffer: padBuffer,
            getByName: function (A, name) {
                var i;
                for (i = 0; i < A.length; i++) {
                    if (A[i] !== undefined && A[i].name === name) { return A[i]; }
                }
                return undefined;
            },
            getNameArray: function (A) {
                var i, names = [];
                for (i = 0; i < A.length; i++) {
                    if (A[i] !== undefined) { names.push(A[i].name); }
                }
                return names;
            },
            popNameArray: function (A, name) {
                var i;
                for (i = 0; i < A.length; i++) {
                    if(A[i] !== undefined && A[i].name === name) {
                        return A.splice(i, 1)[0];
                    }
                }
                return undefined;
            },
            getObjectFromArray: getObjectFromArray,
            writeArray: function (buffer, type, arr) {
                buffer.write(types.int32, arr.length);
                buffer.write(type, arr);
                padBuffer(buffer);
            },
            writeArraySize: function (type, arr) {
                var n = types.int32.size + type.size * arr.length;
                return n + padLength(n);
            },
            readArray: function (buffer, type) {
                var n = buffer.read(types.int32), value;
                value = buffer.read(type, n);
                padSkip(buffer);
                return value;
            },
            readType: function (buffer) {
                var id = buffer.read(types.int32);
                var typeName, type;
                for (typeName in types) {
                    if(types.hasOwnProperty(typeName)) {
                        type = types[typeName];
                        if (type.id === id) {
                            return type;
                        }
                    }
                }
                throw new Error("Invalid type read from buffer: " + id.toString());
            }
        };
    }
    
    function dimensionClass(ncDefs, types) {

        var writeArray = ncDefs.writeArray,
            readArray = ncDefs.readArray,
            numberType = ncDefs.numberType,
            writeArraySize = ncDefs.writeArraySize;
    
        function Dimension(name, id, size) {
            var currentSize, that = this;
            this.name = name;
            this.id = id;
            this.size = size;
            this.unlimited = ( size === undefined || size === 0 );
            this.getCurrentSize = function () { return currentSize; };
            this.setCurrentSize = function (n) { currentSize = n; };
            this.toString = function (tab) {
                if (tab === undefined) { tab = ''; }
                if (this.unlimited) {
                    return tab + name + " = UNLIMITED ; // (" + currentSize + " currently)\n";
                } else {
                    return tab + name + " = " + size.toString() + " ;\n";
                }
            };
            if (this.unlimited) {
                this.size = 0;
            }
            currentSize = this.size;
            this.writeSize = function () {
                return writeArraySize(types.char, name) + numberType.size;
            };
            this.write = function (buffer) {
                writeArray(buffer, types.char, name);
                buffer.write(numberType, that.size);
            };
            Object.freeze(this);
        }
    
        Dimension.read = function (buffer, id) {
            var name = readArray(buffer, types.char),
                size = buffer.read(numberType);
            return new Dimension(name, id, size);
        };
    
        return Dimension;
    }
    
    function attributeClass(ncDefs, types) {
        
        var numberType = ncDefs.numberType,
            padLength = ncDefs.padLength,
            padBuffer = ncDefs.padBuffer,
            readType = ncDefs.readType,
            writeArray = ncDefs.writeArray,
            readArray = ncDefs.readArray,
            writeArraySize = ncDefs.writeArraySize;
    
        function Attribute(name, type) {
            var values = [];
            this.name = name;
            this.type = type;
            this.getValue = function (i) {
                if (i === undefined) {
                    if (type.string) {
                        return values.join('');
                    } else {
                        return values.slice();
                    }
                } else {
                    return values[i];
                }
            };
            this.getLength = function () {
                return values.length;
            };
            this.removeValue = function (i) {
                values.splice(i,1);
            };
            this.clear = function () {
                values = [];
            };
            this.setValue = function (value, i) {
                var j;
                if ( i === undefined ) {
                    values = [];
                    i = 0;
                }
                if (value.hasOwnProperty("length") && value.length !== 1) {
                    values = [];
                    for (j = 0; j < value.length; j++) {
                        this.setValue(value[j], j);
                    }
                    return;
                }
                if (!type.validate(value)) {
                    throw new Error("Invalid value for type " + type.toString());
                }
                if ( typeof(i) !== "number" || i < 0 || Number(i.toFixed(0)) !== i ) {
                    throw new Error("Invalid index");
                }
                values[i] = value;
            };
            this.toString = function (tab) {
                var str = [], j;
                //if (values.length === 0) { return ''; }
                if (tab === undefined) { tab = ''; }
                if (type.numeric) {
                    for (j = 0; j < values.length; j++) {
                        str.push(type.toString(values[j]));
                    }
                } else {
                    str.push(type.toString(values.join("")));
                }
                return tab + name + " = " + str.join(", ") + " ;\n";
            };
            this.writeSize = function () {
                var n = writeArraySize(types.char, name) + numberType.size * 2 + this.getLength() * type.size;
                return n + padLength(n);
            };
            this.write = function (buffer) {
                writeArray(buffer, types.char, name);
                buffer.write(numberType, type.id);
                buffer.write(numberType, this.getLength());
                buffer.write(type, values);
                padBuffer(buffer);
            };
            Object.seal(this);
        }
        Attribute.read = function (buffer) {
            var name = readArray(buffer, types.char),
                type = readType(buffer),
                values = readArray(buffer, type),
                attr = new Attribute(name, type);
            attr.setValue(values);
            return attr;
        };
    
        return Attribute;
    }
    
    function variableClass(ncDefs, types, Attribute) {
    
        var getByName = ncDefs.getByName,
            getNameArray = ncDefs.getNameArray,
            getObjectFromArray = ncDefs.getObjectFromArray,
            writeArraySize = ncDefs.writeArraySize,
            writeArray = ncDefs.writeArray,
            readArray = ncDefs.readArray,
            numberType = ncDefs.numberType,
            readType = ncDefs.readType;
        //    popNameArray = ncDefs.popNameArray;
    
        function Variable(name, type, dimensions) {
            var attributes = [], that = this;
            if (dimensions === undefined) { dimensions = []; }
            this.name = name;
            this.type = type;
            this.dimensions = function () { return dimensions; };
            this.getAttribute = function (name) {
                return getByName(attributes, name);
            };
            this.getAttributes = function () {
                return getNameArray(attributes);
            };
            this.createAttribute = function (name, type) {
                var attr, typeObj;
                if (that.getAttribute(name) !== undefined) {
                    throw new Error("Duplicate attribute name");
                }
                typeObj = types[type];
                if (typeObj === undefined) {
                    throw new Error('Undefined type: ' + type);
                }
                attr = new Attribute(name, typeObj);
                that.addAttribute(attr);
                return attr;
            };
            this.addAttribute = function (attr) {
                attributes.push(attr);
            };
            //this.removeAttribute = function (name) {
            //    if (popNameArray(attributes, name) === undefined) {
            //        throw new Error("Invalid attribute name: " + name);
            //    }
            //};
            this.toString = function (tab, global) {
                var str = [], i, s = [];
                if (tab === undefined) { tab = ''; }
                if (!global) {
                    for (i = 0; i < dimensions.length; i++) {
                        s.push(dimensions[i].name);
                    }
                    str.push(tab + type.cdlType + " " + name + "(" + s.join(", ") + ") ;\n");
                }
                for (i = 0; i < attributes.length; i++) {
                    str.push(tab + "\t" + name + ":" + attributes[i].toString());
                }
                return str.join('');
            };
            this.unlimited = (dimensions.length !== 0) && (dimensions[0].unlimited);
            this.shape = function () {
                var shp = [], i;
                for (i = 0; i < dimensions.length; i++) {
                    shp.push(dimensions[i].getCurrentSize());
                }
                return shp;
            };
            this.size = function () {
                var shape = that.shape();
                return shape.reduce(function (a,b) {return a*b;}, 1);
            };
            this.vsize = function () {
                var shape = that.shape();
                if (that.unlimited) {
                    shape = shape.slice(1,dimensions.length);
                }
                return type.size * shape.reduce(function (a,b) {return a*b;}, 1);
            };
            this.attributes = function () {
                return getObjectFromArray(attributes);
            };
            this.nattrs =  function () { return attributes.length; };
            this.writeAttributesHeaderSize = function () {
                var n = 3*numberType.size, i;
                for (i = 0; i < that.nattrs(); i++) {
                    n += attributes[i].writeSize();
                }
                return n;
            };
            this.writeHeaderSize = function () {
                return writeArraySize(types.char, name) +
                 numberType.size * (dimensions.length + 2) +
                 that.writeAttributesHeaderSize();
            };
            this.writeAttributesHeader = function (buffer) {
                var i;
                if (that.nattrs() > 0) {
                    buffer.write(numberType, ncDefs.NC_ATTRIBUTE);
                } else {
                    buffer.write(numberType, ncDefs.NC_ABSENT);
                }
                buffer.write(numberType, that.nattrs());
                for (i = 0; i < that.nattrs(); i++) {
                    attributes[i].write(buffer);
                }
            };
            this.writeHeader = function (buffer) {
                var i;
                writeArray(buffer, types.char, name);
                buffer.write(numberType, dimensions.length);
                for (i = 0; i < dimensions.length; i++) {
                    buffer.write(numberType, dimensions[i].id);
                }
                that.writeAttributesHeader(buffer);
                buffer.write(numberType, type.id);
                buffer.write(numberType, that.vsize());
            };
        }
    
        Variable.readHeader = function (buffer, dimensions) {
            var name = readArray(buffer, types.char),
                ndims = buffer.read(numberType),
                i, dims = [], attrs, type, vsize, v;
            for (i = 0; i < ndims; i++) {
                dims.push(dimensions[buffer.read(numberType)]);
            }
            attrs = Variable.readAttributesHeader(buffer);
            type = readType(buffer);
            vsize = buffer.read(numberType);
            v = new Variable(name, type, dims);
            for (i = 0; i < attrs.length; i++) {
                v.addAttribute(attrs[i]);
            }
            return v;
        };
        Variable.readAttributesHeader = function (buffer) {
            var i, attrs = [],
                attrSent = buffer.read(numberType),
                nattrs = buffer.read(numberType);
            if (attrSent !== ncDefs.NC_ABSENT && attrSent !== ncDefs.NC_ATTRIBUTE) {
                throw new Error('Invalid attribute in header');
            }
            if (attrSent === ncDefs.NC_ABSENT) { nattrs = 0; }
            for (i = 0; i < nattrs; i++) {
                attrs.push(Attribute.read(buffer));
            }
            return attrs;
        };
    
        return Variable;
    }
    
    function ncFileClass(File, ncDefs, types, Buffer, Dimension, Variable) {
    
        var getByName = ncDefs.getByName;
        var getObjectFromArray = ncDefs.getObjectFromArray;
        var numberType = ncDefs.numberType;
        
        function NcFile(fileName, readWrite, fileType) {
            var vars = [];
            var dims = [];
            var gVar = new Variable('', types.char);
            var offsetSize = 32;
            var defineMode = true;
            var offsets = [];
            var recsize = 0;
            var buffer, file;
            
            function headerSize() {
                var i;
                var n = 4; // magic + version
                n += numberType.size; // numrecs
                n += numberType.size * 2; // dimension length
                for (i = 0; i < dims.length; i++) { // dimensions
                    n += dims[i].writeSize();
                }
                n += gVar.writeAttributesHeaderSize(); // global attributes
                n += numberType.size * 2; // variable length
                for (i = 0; i < vars.length; i++) { // variables
                    n += vars[i].writeHeaderSize();
                    n += offsetSize; // offsets handled by the file class
                }
                return n;
            }
            
            function readHeader() {
                var value, numrecs, ndims, nvars, i, attrs, v;
                if (readWrite !== 'r') {
                    throw new Error('readHeader called on write-only file');
                }
                if (!defineMode) {
                    throw new Error('readHeader called twice');
                }
                value = buffer.read(types.char, 4);
                if (value.slice(0,3) !== ncDefs.NC_MAGIC) {
                    throw new Error('Invalid netcdf file');
                } else if (value[3] === ncDefs.NC_32BIT) {
                    fileType = 'NETCDF_CLASSIC';
                    offsetSize = 32;
                } else if (value[3] === ncDefs.NC_64BIT) {
                    fileType = 'NETCDF-64BITOFFSET';
                    offsetSize = 64;
                } else {
                    throw new Error('Unsupported file type');
                }
                numrecs = buffer.read(numberType);
                value = buffer.read(numberType);
                ndims = buffer.read(numberType);
                if (value !== ncDefs.NC_DIMENSION && value !== ncDefs.NC_ABSENT) {
                    throw new Error('Invalid netcdf file: no dimensions found');
                }
                for (i = 0; i < ndims; i++) {
                    dims.push(Dimension.read(buffer, i));
                }
                attrs = Variable.readAttributesHeader(buffer);
                for (i = 0; i < attrs.length; i++) {
                    gVar.addAttribute(attrs[i]);
                }
                value = buffer.read(numberType);
                nvars = buffer.read(numberType);
                if (value !== ncDefs.NC_VARIABLE && value !== ncDefs.NC_ABSENT) {
                    throw new Error('Invalid netcdf file: no variables found');
                }
                for (i = 0; i < nvars; i++) {
                    v = Variable.readHeader(buffer, dims);
                    vars.push(v);
                    if (offsetSize === 64) {
                        value = buffer.read(numberType);
                        if (value !== 0) {
                            throw new Error('Unsupported offset in 64 bit file');
                        }
                    }
                    offsets[i] = buffer.read(numberType);
                    if (v.unlimited) { recsize += v.vsize(); }
                }
    
                defineMode = false;
            }
    
            function writeHeader() {
                var nbytes, i, offset, numrecs;
                if (readWrite !== 'w') {
                    throw new Error('writeHeader called on read-only file');
                }
                if (!defineMode) {
                    throw new Error('Header already exists');
                }
                nbytes = headerSize();
                buffer = new Buffer(new DataView(new ArrayBuffer(nbytes)));
                buffer.write(types.char, ncDefs.NC_MAGIC);
                if (fileType === 'NETCDF_CLASSIC') {
                    buffer.write(types.char, ncDefs.NC_32BIT);
                } else if (fileType === 'NETCDF_64BITOFFSET') {
                    buffer.write(types.char, ncDefs.NC_64BIT);
                } else {
                    throw new Error('Invalid file type: ' + fileType);
                }
                numrecs = 0;
                for (i = 0; i < dims.length; i++) {
                    if (dims[i].unlimited) {
                        numrecs = dims[i].getCurrentSize();
                    }
                }
                buffer.write(numberType, numrecs);
                if (dims.length > 0) {
                    buffer.write(numberType, ncDefs.NC_DIMENSION);
                } else {
                    buffer.write(numberType, ncDefs.NC_ABSENT);
                }
                buffer.write(numberType, dims.length);
                for (i = 0; i < dims.length; i++) {
                    dims[i].write(buffer);
                }
                gVar.writeAttributesHeader(buffer);
    
                if (vars.length > 0) {
                    buffer.write(numberType, ncDefs.NC_VARIABLE);
                } else {
                    buffer.write(numberType, ncDefs.NC_ABSENT);
                }
                buffer.write(numberType, vars.length);
    
                offset = nbytes;
                for (i = 0; i < vars.length; i++) { // loop through non-record variables
                    if (!vars[i].unlimited) {
                        vars[i].writeHeader(buffer);
                        if (offsetSize === 64) {
                            buffer.write(numberType, 0);
                        }
                        buffer.write(numberType, offset);
                        offsets[i] = offset;
                        offset += vars[i].vsize();
                        if (offset > 0x7FFFFFFF) { // for now only supporting 32 bit signed offset even for 64 bit files
                            throw new Error('Offset too large for this netcdf implementation, sorry.');
                        }
                    }
                }
                for (i = 0; i < vars.length; i++) { // loop through record variables
                    if (vars[i].unlimited) {
                        vars[i].writeHeader(buffer);
                        if (offsetSize === 64) {
                            buffer.write(numberType, 0);
                        }
                        buffer.write(numberType, offset);
                        offsets[i] = offset;
                        offset += vars[i].vsize();
                        recsize += vars[i].vsize();
                        if (offset > 0x7FFFFFFF) { // for now only supporting 32 bit signed offset even for 64 bit files
                            throw new Error('Offset too large for this netcdf implementation, sorry.');
                        }
                    }
                }
                defineMode = false;
                file.write(buffer.dataView);
            }
            
            if (readWrite === undefined) { readWrite = 'w'; }
            if (fileType === undefined) { fileType = 'NETCDF_CLASSIC'; }
            if (fileType === 'NETCDF_64BITOFFSET') { offsetSize = 64; }
            
            file = new File(fileName, readWrite);
            this.readWrite = readWrite;
            this.fileType = fileType;
    
            if (readWrite === 'w') {
                this.createDimension = function (name, size) {
                    var dim = new Dimension(name, dims.length, size);
                    dims.push(dim);
                    return dim;
                };
    
                this.createAttribute = gVar.createAttribute;
    
                this.createVariable = function (name, type, dimensions) {
                    var dimArray = [], v, i, dim, typeObj;
                    for (i = 0; i < dimensions.length; i++) {
                        dim = getByName(dims, dimensions[i]);
                        if (dim === undefined) {
                            throw new Error('Undefined dimension: ' + dimensions[i]);
                        }
                        dimArray.push(dim);
                    }
                    typeObj = types[type];
                    if (typeObj === undefined) {
                        throw new Error('Undefined type: ' + type);
                    }
                    v = new Variable(name, typeObj, dimArray);
                    v.write = function (start, count) {
                        start = count;
                    };
                    Object.freeze(v);
                    vars.push(v);
                    return v;
                };
            } else if (readWrite === 'r') {
                buffer = new Buffer(file.read());
                readHeader();
            } else {
                throw new Error('Invalid readWrite flag: ' + readWrite);
            }
            this.variables = function () {
                return getObjectFromArray(vars);
            };
            this.attributes = gVar.attributes;
            this.nattrs = gVar.nattrs;
            this.dimensions = function () {
                return getObjectFromArray(dims);
            };
            this.toString = function (fileName) {
                var str = [], i;
                if (fileName === undefined) { fileName = 'file'; }
                str.push('netcdf ' + fileName + ' {\n');
                str.push('dimensions:\n');
                for (i = 0; i < dims.length; i++) {
                    str.push(dims[i].toString('\t'));
                }
                str.push('variables:\n');
                for (i = 0; i < vars.length; i++) {
                    str.push(vars[i].toString('\t'));
                }
                if (this.nattrs() > 0) {
                    str.push('\n// global attributes:\n');
                    str.push(gVar.toString('\t', true));
                }
                str.push('}');
                return str.join('');
            };
            this.getBuffer = function () {
                return buffer;
            };
            this.numrecs = function () {
                var i;
                for (i = 0; i < dims.length; i++) {
                    if (dims[i].unlimited) {
                        return dims[i].getCurrentSize();
                    }
                }
                return 0;
            };
            this.toObject = function () {
                var obj = {}, i;
                function attrJSON(alist) {
                    var i, attrs = {};
                    for (i in alist) {
                        if (alist.hasOwnProperty(i)) {
                            attrs[alist[i].name] = {
                                type: alist[i].type.toString(),
                                value: alist[i].getValue()
                            };
                        }
                    }
                    return attrs;
                }
                function dimNames(dlist) {
                    var i, d = [];
                    for (i = 0; i < dlist.length; i++) {
                        d.push(dlist[i].name);
                    }
                    return d;
                }
                obj.fileType = fileType;
                //obj.numrecs = this.numrecs();
                obj.dimensions = {};
                obj.variables = {};
                obj.attributes = {};
                for (i = 0; i < dims.length; i++) {
                    obj.dimensions[dims[i].name] = dims[i].size;
                }
                obj.attributes = attrJSON(gVar.attributes());
                for (i = 0; i < vars.length; i++) {
                    obj.variables[vars[i].name] = {
                        dimensions: dimNames(vars[i].dimensions()),
                        type: vars[i].type.toString(),
                        attributes: attrJSON(vars[i].attributes())
                    };
                }
                return obj;
            };
            this.close = function () {
                if (defineMode) {
                    writeHeader();
                }
                return this.getBuffer();
            };
            Object.freeze(this);
        }
    
        NcFile.fromObject = function (obj) {
            var key, f, fileType, attr, v;
            function addAttributes(obj, forv) {
                var key;
                if (obj.hasOwnProperty('attributes')) {
                    for (key in obj.attributes) {
                        if (obj.attributes.hasOwnProperty(key)) {
                            attr = forv.createAttribute(key, obj.attributes[key].type);
                            attr.setValue(obj.attributes[key].value);
                        }
                    }
                }
            }
            if (obj.hasOwnProperty('fileType')) { fileType = obj.fileType; }
            f = new NcFile(undefined, 'w', fileType);
            if (obj.hasOwnProperty('dimensions')) {
                for (key in obj.dimensions) {
                    if (obj.dimensions.hasOwnProperty(key)) {
                        f.createDimension(key, obj.dimensions[key]);
                    }
                }
            }
            addAttributes(obj, f);
            if (obj.hasOwnProperty('variables')) {
                for (key in obj.variables) {
                    if (obj.variables.hasOwnProperty(key)) {
                        v = f.createVariable(key, obj.variables[key].type, obj.variables[key].dimensions);
                        addAttributes(obj.variables[key], v);
                    }
                }
            }
            return f;
        };
    
        return NcFile;
    }
    var NodeBuffer = Buffer;
    var File = fileClass(),
        BufferWrap = bufferClass(),
        types = typesClass(),
        ncDefs = ncDefsClass(types),
        Dimension = dimensionClass(ncDefs, types),
        Attribute = attributeClass(ncDefs, types),
        Variable = variableClass(ncDefs, types, Attribute),
        NcFile = ncFileClass(File, ncDefs, types, BufferWrap, Dimension, Variable);
    return NcFile;
}));
