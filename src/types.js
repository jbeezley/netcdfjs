
'use strict';

var getMethod = 'get',
    setMethod = 'set',
    two32 = Math.pow(2, 32);

function TypeDef () {}
TypeDef.prototype = {
    validation: [function (value) { return value !== undefined; },
                 function (value) { return value !== null; }],
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
StringType.prototype.typedArray = Uint8Array;

function NumberType () {}
NumberType.prototype = Object.create(TypeDef.prototype);
NumberType.prototype.validation = TypeDef.prototype.validation.slice();
NumberType.prototype.validation.push(function (value) { return typeof(value) === 'number'; });
NumberType.prototype.validation.push(function (value) { return Number.isFinite(value); });
NumberType.prototype.validation.push(function (value) { return !Number.isNaN(value); });

function SignedIntType (nBytes, fmtChar, typedArray) {
    var maxValue =  Math.pow(2, nBytes * 8 - 1) - 1,
        minValue = -maxValue - 1;
    this.typedArray = typedArray;
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

function FloatType (nBytes, fmtChar, typedArray, prec) {
    this.typedArray = typedArray;
    this.typeSize = nBytes;
    this.fmtChar = fmtChar;
    this.prec = prec;
}
FloatType.prototype = Object.create(NumberType.prototype);
FloatType.prototype.readValue = function (index, view) {
    return view[getMethod + 'Float' + (this.typeSize * 8).toString()](index);
};
FloatType.prototype.writeValue = function (index, view, value) {
    view[setMethod + 'Float' + (this.typeSize * 8).toString()](index, value);
    return this.typeSize;
};
FloatType.prototype.format = function (value) {
    var s;
    value = Number(value.toPrecision(this.prec));

    s = value.toString();
    if (s.search(/\./) === -1) {
        if (s.search(/e/) === -1) { s = s + '.'; }
        else { s = s.replace('e', '.e'); }
    }
    return s;
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

var numberObj = new SignedIntType(4, '', Int32Array);
var float32Obj = new FloatType(4, 'f', Float32Array, 7);
var float64Obj = new FloatType(8, '', Float64Array);

function DataType (typeStr, typeObj, cdlType) {
    var that = this;
    this.cdlType = cdlType;
    this.typeSize = typeObj.typeSize;
    this.typedArray = typeObj.typedArray;
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
    this.validate = function (value) { return typeObj.validate.call(typeObj, value); };
    Object.freeze(this);
}


var types = {
    string: new DataType('string', new StringType(), 'char'),
    int8:  new DataType('int8',  new SignedIntType(1, 'b', Int8Array), 'byte'),
    int16: new DataType('int16', new SignedIntType(2, 's', Int16Array), 'short'),
    int32: new DataType('int32', new SignedIntType(4, '', Int32Array), 'int'),
    int64: new DataType('int64', int64Obj, 'long'),
    float32: new DataType('float32', float32Obj, 'float'),
    float64: new DataType('float64', float64Obj, 'double')
};
Object.defineProperty(types, 'fromString', { value: function (s) {
    var t = s.trim(), n = t.length, out = {}, l = t[n-1], m = t.slice(0, n-1);
    if (t[0] === '"' && l === '"') {
        out.type = types.string;
        out.value = t.slice(1, n - 1);
    } else if (l === 'b') {
        out.type = types.int8;
        out.value = Number(m);
    } else if (l === 's') {
        out.type = types.int16;
        out.value = Number(m);
    } else if (l === 'f') {
        out.type = types.float32;
        out.value = Number(Number(m).toPrecision(7));
    } else if (l === 'l') {
        out.type = types.int64;
        out.value = Number(m);
    } else {
        m = Number(t);
        out.value = m;
        if (t.search(/\./) === -1 && t.search(/e/) === -1)  {
            out.type = types.int32;
            out.value = m;
        } else {
            out.type = types.float64;
            out.value = m;
        }
    }
    if (Number.isNaN(out.value) || out.type === undefined || !out.type.validate(out.value)) {
        throw new Error("Could not convert value from string: " + s);
    }
    return out;
}});
Object.defineProperty(types, 'fromCDL', { value: function (s) {
    var type, name;
    for (name in this) {
        if (this.hasOwnProperty(name)) {
            type = this[name];
            if(type.cdlType === s) {
                return type;
            }
        }
    }
    throw new Error("Invalid CDL data type");
}});
Object.freeze(types);

module.exports = types;
