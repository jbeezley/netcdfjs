'use strict';

var common = require('./common');

function ReadFile(obj) {
    var fname, fobj, fsize;
    
    fname = obj.name;
    fobj = obj;
    fsize = obj.size;

    this.getView = function (start, end, done) {
        var buf, reader;
        if (end > fsize) { end = fsize; }
        buf = fobj.slice(start, end);
        reader = new FileReader();
        reader.onload = function () {
            done(common.getDataView(reader.result));
        };
        reader.readAsArrayBuffer(buf);
    };
}

module.exports = ReadFile;
