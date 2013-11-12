
var chai = require('chai');
chai.should();

var NcFile = require('ncfile');

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
});
