if (typeof define !== 'function') {
    var define = require('amdefine')(module);
}

define(function () {
    'use scrict';
    var dP = Object.defineProperty, numberSize = 4, numberType = 'int32';
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
                buffer.write(numberType, [0, 0]);
            }
        }
    }
    return OMap;
})