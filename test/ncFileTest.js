
var chai = require('chai');
chai.should();

var libpath = process.env['NETCDFJS_COV'] ? '../src-cov' : '../src';
var NcFile = require(libpath + '/netcdf3.js');

var fs = require('fs');

function writeFile(fileName, buffer) {
}

function readFile(fileName) {
    var buffer, i, f, val;
    var b = fs.readFileSync(fileName);
    buffer = new DataView(new ArrayBuffer(b.length));
    for (i = 0; i < b.length; i++) {
        val = b.readInt8(i);
        buffer.setInt8(i, val);
    }
    return buffer;
}

function writeCDL(fileName, f) {
    var s = f.toString(fileName);
    fs.writeFileSync(fileName, s);
}

describe('NcFile', function () {
    it('Construct simple file', function (done) {
        var f = new NcFile('simple.nc'), g;
        var v, a, b, s;
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
        s = f.toString();
        b = f.close();

        g = new NcFile('simple.nc', 'r');
        g.toString().should.equal(f.toString());
        
        done();
    });
    it('Construct empty file', function (done) {
        var f = new NcFile('empty.nc'), g;
        writeCDL('empty.cdl', f);
        var b = f.close();
        g = new NcFile('empty.nc');
        g.toString().should.equal(f.toString());
        done();
    });
});
