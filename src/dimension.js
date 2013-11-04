
if (typeof define !== 'function') {
    var define = require('amdefine')(module);
}

define(function () {
    'use strict';
    
    function Dimension(name, id, size) {
        var currentSize;
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
        Object.freeze(this);
    }

    return Dimension;
});
