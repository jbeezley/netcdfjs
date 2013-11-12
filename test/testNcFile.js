
var chai = require('chai');
chai.should();

var NcFile = require('ncfile');
var fs = require('fs');

describe('NcFile', function () {
    it('create file', function (done) {
        var f = new NcFile();

        done();
    });
    it('Construct simple file', function (done) {
        var f = new NcFile(), g;
        var v, a, b, s;
        f.createDimension('nx', 10);
        f.createDimension('ny', 15);
        f.createDimension('Time');
        f.createVariable('varA', 'int32', ['nx', 'ny']);
        v = f.createVariable('varB', 'float32', ['Time', 'ny', 'nx']);
        a = v.createAttribute('attrA', 'float64');
        a.set([1,2,3]);
        a = f.createAttribute('attrStr', 'string');
        a.set('I am an attribute');
        
        done();
    });
    function testRead(fname) {
        it('Reading ' + fname, function (done) {
            var buffer = fs.readFileSync('test/data/' + fname);
            NcFile.read(buffer, function (obj) {
                var cdl, base, str;
                if (obj.constructor !== NcFile) {
                    throw obj;
                }
                base = fname.substr(0, fname.length-3);
                cdl = 'test/data/' + base + '.cdl';
                str = fs.readFileSync(cdl).toString().replace(/\\000/gm, '\x00').replace(/\\001/gm, '\x01').replace(/\\002/gm, '\x02');
                obj.toString(base).should.equal(str);
                done();
            });
        })
    }
    testRead('empty.nc');
    testRead('simple.nc');
    testRead('types.nc');
    testRead('wrf.nc');
});
