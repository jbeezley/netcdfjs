'use strict';

var common = require('./common');
var fs = false;
if (typeof process !== undefined) {
    fs = require('fs');
}

function ReadFile(obj) {
    var fname, fobj, isNode, fsize;
    if (typeof obj === 'string') {
        isNode = true;
        fname = obj;
        fobj = fs.openSync(fname, 'r');
        fsize = fs.fstatSync(fobj).size;
    } else {
        isNode = false;
        fname = obj.name;
        fobj = obj;
        fsize = obj.size;
    }

    this.getView = function (start, end, done) {
        var buf, reader;
        if (end > fsize) { end = fsize; }
        if (isNode) {
            buf = new Buffer(end - start);
            fs.readSync(fobj, buf, 0, end - start, start);
            done(common.getDataView(buf));
        } else {
            buf = fobj.slice(start, end);
            reader = new FileReader();
            reader.onload = function () {
                done(common.getDataView(reader.result));
            };
            reader.readAsArrayBuffer(buf);
        }
    };
}

module.exports = ReadFile;
