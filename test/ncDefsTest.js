
var chai = require('chai');
chai.should();

var libpath = process.env['NETCDFJS_COV'] ? '../src-cov' : '../src';
var ncDefs = require(libpath + '/ncDefs.js'),
    padLength = ncDefs.padLength,
    padBuffer = ncDefs.padBuffer,
    padSkip = ncDefs.padSkip;

describe('ncDefs', function () {
    it('padLength', function (done) {
        padLength(0).should.equal(0);
        padLength(1).should.equal(3);
        padLength(2).should.equal(2);
        padLength(3).should.equal(1);
        padLength(4).should.equal(0);
        padLength(15).should.equal(1);
        padLength(17).should.equal(3);
        padLength(22).should.equal(2);
        done();
    });
});
