
if (typeof define !== 'function') {
    var define = require('amdefine')(module);
}

define(function (require) {
    'use strict';

    var Dimension = require('./dimension.js');
    var Variable  = require('./variable.js');
    var Buffer    = require('./buffer.js');
    var types     = require('./types.js');
    var ncDefs    = require('./ncDefs.js');
    var getByName = ncDefs.getByName;
    var getObjectFromArray = ncDefs.getObjectFromArray;
    var numberType = ncDefs.numberType;
    
    function NcFile(buffer, readWrite, fileType) {
        var vars = [];
        var dims = [];
        var gVar = new Variable('', types.char);
        var offsetSize = 32;
        var defineMode = true;
        var offsets = [];
        var recsize = 0;
        
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
        }
        
        if (readWrite === undefined) { readWrite = 'w'; }
        if (fileType === undefined) { fileType = 'NETCDF_CLASSIC'; }
        if (fileType === 'NETCDF_64BITOFFSET') { offsetSize = 64; }
        
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
                };
                Object.freeze(v);
                vars.push(v);
                return v;
            };
        } else if (readWrite === 'r') {
            buffer = new Buffer(buffer);
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
});
