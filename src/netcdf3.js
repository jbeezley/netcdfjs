
if (typeof define !== 'function') {
    var define = require('amdefine')(module);
}

define(function (require) {
    'use strict';

    var Attribute = require('./attribute.js');
    var Dimension = require('./dimension.js');
    var Variable  = require('./variable.js');
    var types     = require('./types.js');
    var ncDefs    = require('./ncDefs.js');
    var getByName = ncDefs.getByName;
    var getObjectFromArray = ncDefs.getObjectFromArray;
    
    function NcFile(buffer, readWrite, fileType) {
        var vars = [];
        var dims = [];
        var gVar = new Variable('', types.char);
        var buffer;

        function writeHeader() {
            if (readWrite !== 'w') {
                throw new Error('writeHeader called on read-only file');
            }
        }
        
        if (readWrite === undefined) { readWrite = 'w'; }
        if (fileType === undefined) { fileType = 'NETCDF_CLASSIC'; }
        
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
        Object.freeze(this);
    }

    return NcFile;
});
