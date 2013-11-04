
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
        getObjectFromArray = ncDefs.getObjectFromArray;
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
            attributes.push(attr);
            return attr;
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
        this.attributes = function () {
            return getObjectFromArray(attributes);
        };
        this.nattrs =  function () { return attributes.length; };
    }

    return Variable;

});
