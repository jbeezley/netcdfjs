
var chai = require('chai');
chai.should();

var libpath = process.env['NETCDFJS_COV'] ? '../src-cov' : '../src';
var NcFile = require(libpath + '/netcdf3.js');

describe('NcFile', function () {
    it('Construct simple file', function (done) {
        var f = new NcFile();
        var v, a;
        f.createDimension('nx', 10);
        f.createDimension('ny', 15);
        f.createDimension('Time');
        f.createVariable('varA', 'int32', ['nx', 'ny']);
        v = f.createVariable('varB', 'float32', ['Time', 'ny', 'nx']);
        a = v.createAttribute('attrA', 'float64');
        a.setValue([1,2,3]);
        a = f.createAttribute('attrStr', 'char');
        a.setValue('I am an attribute');
        //console.log('\n' + f.toString() + '\n');
        f.close();
        done();
    });
});
