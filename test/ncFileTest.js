
var chai = require('chai');
chai.should();

var libpath = process.env['NETCDFJS_COV'] ? '../src-cov' : '../src';
var NcFile = require(libpath + '/netcdf3.js');

var types = require(libpath + '/types.js');
var fs = require('fs');

function writeFile(fileName, buffer) {
    var i, val;
    buffer.seek(0);
    b = new Buffer(buffer.length);
    for (i = 0; i < buffer.length; i++) {
        val = buffer.read(types.int8);
        b.writeInt8(val, i);
    }
    fs.writeFileSync(fileName, b);
}

function writeCDL(fileName, f) {
    var s = f.toString(fileName);
    fs.writeFileSync(fileName, s);
}

describe('NcFile', function () {
    it('Construct simple file', function (done) {
        var f = new NcFile();
        var v, a, b;
        f.createDimension('nx', 10);
        f.createDimension('ny', 15);
        f.createDimension('Time');
        f.createVariable('varA', 'int32', ['nx', 'ny']);
        v = f.createVariable('varB', 'float32', ['Time', 'ny', 'nx']);
        a = v.createAttribute('attrA', 'float64');
        a.setValue([1,2,3]);
        a = f.createAttribute('attrStr', 'char');
        a.setValue('I am an attribute');
        writeCDL('test.cdl', f);
        //console.log('\n' + f.toString() + '\n');
        b = f.close();
        writeFile('test.nc', b);
        done();
    });
    it('Construct empty file', function (done) {
        var f = new NcFile();
        writeCDL('empty.cdl', f);
        var b = f.close();
        writeFile('empty.nc', b);
        done();
    });
});
