

if (typeof define !== 'function') {
    var define = require('amdefine')(module);
}

define(function () {
    'use strict';
    
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
});
