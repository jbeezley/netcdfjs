var chai = require('chai');
var expect = chai.expect;
chai.should();

var libpath = process.env['NETCDFJS_COV'] ? '../scripts-cov' : '../scripts';
var netcdf3 = require(libpath + '/netcdf3.js');

var NcFile = netcdf3.NcFile;

describe('netcdf3', function () {
    describe('NcFile', function () {
        it('test create a file object', function () {
            var f = new NcFile();
        })
    })
})