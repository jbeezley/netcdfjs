
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
    
    var getMethod = 'get',
        setMethod = 'set',
        two32 = Math.pow(2, 32);

    function TypeDef () {}
    TypeDef.prototype = {
        validation: [function (value) { return value !== undefined; }],
        format: function (value) {
            return value.toString();
        },
        validate: function (value) {
            var i;
            for (i = 0; i < this.validation.length; i++) {
                if (!this.validation[i](value)) { return false; }
            }
            return true;
        },
        fmtChar: '',
        typeSize: 1,
        readData: function (index, view, length) {
            var value = [], i;
            if (length === undefined) {
                return this.readValue(index, view);
            } else {
                for (i = 0; i < length; i++) {
                    value.push(this.readData(index + i * this.typeSize, view));
                }
            }
            return value;
        },
        writeData: function (index, view, data) {
            var i, nbytes = 0;
            if (typeof data === 'string') {
                for (i = 0; i < data.length; i++) {
                    view[setMethod + 'Uint8'](index + i, data.charCodeAt(i));
                    nbytes++;
                }
            } else if (Array.isArray(data)) {
                for (i = 0; i < data.length; i++) {
                    nbytes += this.writeData(index + nbytes, view, data[i]);
                }
                return nbytes;
            } else {
                if (!this.validate(data)) {
                    throw new Error("Invalid data element: " + data);
                }
                nbytes += this.writeValue(index, view, data);
            }
            return nbytes;
        }
    };
    
    function StringType () {}
    StringType.prototype = Object.create(TypeDef.prototype);
    StringType.prototype.format = function (value) {
        //if (Array.isArray(value)) { value = value.join(''); }
        return '"' + value + '"';
    };
    StringType.prototype.validation = TypeDef.prototype.validation.slice();
    StringType.prototype.validation.push(function (value) { return typeof(value) === 'string'; });
    StringType.prototype.readData = function (index, view, length) {
        var value = TypeDef.prototype.readData.call(this, index, view, length);
        if (Array.isArray(value)) { value = value.join(''); }
        return value;
    };
    StringType.prototype.readValue = function (index, view) {
        return String.fromCharCode(view[getMethod + 'Uint8'](index));
    };
    StringType.prototype.writeValue = function () {
        throw new Error('Internal error in types.js');
    };

    function NumberType () {}
    NumberType.prototype = Object.create(TypeDef.prototype);
    NumberType.prototype.validation = TypeDef.prototype.validation.slice();
    NumberType.prototype.validation.push(function (value) { return typeof(value) === 'number'; });
    
    function SignedIntType (nBytes, fmtChar) {
        var maxValue =  Math.pow(2, nBytes * 8 - 1) - 1,
            minValue = -maxValue - 1;
        this.fmtChar = fmtChar;
        this.typeSize = nBytes;
        this.validation = this.validation.slice();
        this.validation.push(function (value) {
            return (value <= maxValue && value >= minValue);
        });
        if (nBytes > 4) {
            this.validation.push(function (value) {
                return (value + 1 > value) && (value - 1 < value);
            });
        }
    }
    SignedIntType.prototype = Object.create(NumberType.prototype);
    SignedIntType.prototype.validation = NumberType.prototype.validation.slice();
    SignedIntType.prototype.validation.push(function (value) { return Math.round(value) === value; });
    SignedIntType.prototype.readValue = function (index, view) {
        var value = view[getMethod + 'Int' + (this.typeSize * 8).toString()](index);
        return value;
    };
    SignedIntType.prototype.writeValue = function (index, view, value) {
        view[setMethod + 'Int' + (this.typeSize * 8).toString()](index, value);
        return this.typeSize;
    };

    function FloatType (nBytes, fmtChar) {
        this.typeSize = nBytes;
        this.fmtChar = fmtChar;
    }
    FloatType.prototype = Object.create(NumberType.prototype);
    FloatType.prototype.readValue = function (index, view) {
        return view[getMethod + 'Float' + (this.typeSize * 8).toString()](index);
    };
    FloatType.prototype.writeValue = function (index, view, value) {
        view[setMethod + 'Float' + (this.typeSize * 8).toString()](index, value);
        return this.typeSize;
    };
    
    var int64Obj = new SignedIntType(8, 'l');
    int64Obj.readValue = function (index, view) {
        var hi, lo;
        hi = view[getMethod + 'Int32'](index);
        lo = view[getMethod + 'Uint32'](index + 4);
        if (hi >= 0) {
            return hi * two32 + lo;
        } else {
            // not correct:
            //return -((two32 - lo) + two32 * (two32 - 1 - hi));
            throw new Error("Writing signed 64bit integers not yet supported");
        }
    };
    int64Obj.writeValue = function (index, view, value) {
        var hi, lo;
        if (value >= 0) {
            hi = Math.floor(value/two32);
            lo = Math.floor(value - hi * two32);
        } else {
            // figure this out later maybe
            throw new Error("Writing signed 64bit integers not yet supported");
        }
        view[setMethod + 'Uint32'](index, hi);
        view[setMethod + 'Uint32'](index + 4, lo);
        return 8;
    };
    
    var numberObj = new SignedIntType(4, '');
    var float32Obj = new FloatType(4, 'f');
    var float64Obj = new FloatType(8, '');
    
    function DataType (typeStr, typeObj) {
        var that = this;
        this.toString = function (value) {
            var i, s = [];
            if (value === undefined) {
                s.push(typeStr);
            } else if (Array.isArray(value)) {
                for (i = 0; i < value.length; i++) {
                    s.push(that.toString(value[i]));
                }
            } else {
                if (typeObj.validate(value)) {
                    s.push(typeObj.format(value) + typeObj.fmtChar);
                } else {
                    throw new Error("Invalid value for type");
                }
            }
            return s.join(', ');
        };
        this.read = function (index, view, length) {
            return typeObj.readData(index, view, length);
        };
        this.write = function (index, view, value) {
            return typeObj.writeData(index, view, value);
        };
        this.readArray = function (index, view) {
            var length = numberObj.readValue(index, view);
            return typeObj.readData(index + numberObj.typeSize, view, length);
        };
        this.writeArray = function (index, view, value) {
            numberObj.writeValue(index, view, value.length);
            return numberObj.typeSize + typeObj.writeData(index + numberObj.typeSize, view, value);
        };
        Object.freeze(this);
    }


    var types = {
        string: new DataType('string', new StringType()),
        int8:  new DataType('int8',  new SignedIntType(1, 'b')),
        int16: new DataType('int16', new SignedIntType(2, 's')),
        int32: new DataType('int32', new SignedIntType(4, '')),
        int64: new DataType('int64', int64Obj),
        float32: new DataType('float32', float32Obj),
        float64: new DataType('float64', float64Obj)
    };
    Object.freeze(types);

    return types;
}));
