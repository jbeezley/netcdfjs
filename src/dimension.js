
if (typeof define !== 'function') {
    var define = require('amdefine')(module);
}

define(function (require) {
    'use strict';
    var ncDefs = require('./ncDefs.js'),
        writeArray = ncDefs.writeArray,
        readArray = ncDefs.readArray,
        numberType = ncDefs.numberType,
        writeArraySize = ncDefs.writeArraySize;
    var types = require('./types.js');

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
});
