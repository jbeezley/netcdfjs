
if (typeof define !== 'function') {
    var define = require('amdefine')(module);
}

define(function (require) {
    'use strict';

    var types = require('./types.js');
    var ncDefs = require('./ncDefs.js');
    var Attribute = require('./attribute.js');
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
        this.dimensions = dimensions;
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
            return shape.reduce(function (a,b) {return a*b;}, 1);
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
            that.writeAttributes(buffer);
            buffer.write(numberType, type.id);
            buffer.write(numberType, that.vsize());
        };
    }

    Variable.readHeader = function (buffer, dimensions) {
        var name = readArray(buffer, types.char),
            ndims = buffer.read(numberType),
            i, dims, attrs, type, vsize, v;
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
        if (attrSent === ncDefs.NC_ABSENT) { nattrs = 0; }
        for (i = 0; i < nattrs; i++) {
            attrs.push(Attribute.read(buffer));
        }
        return attrs;
    };

    return Variable;

});
