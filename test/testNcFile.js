
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
            //var buffer = fs.readFileSync('test/data/' + fname);
            NcFile.read('test/data/' + fname, function (obj) {
                var cdl, base, str;
                if (obj.constructor !== NcFile) {
                    throw obj;
                }
                base = fname.substr(0, fname.length-3);
                cdl = 'test/data/' + base + '.cdl';
                str = fs.readFileSync(cdl).toString().replace(/\\000/gm, '\x00').replace(/\\001/gm, '\x01').replace(/\\002/gm, '\x02');
                obj.toString(base).should.equal(str);
                vars = obj.variables;
                for (var v in vars) {
                    vars[v].read(function () {});
                }
                done();
            });
        })
    }
    testRead('empty.nc');
    testRead('simple.nc');
    testRead('types.nc');
    testRead('wrf.nc');
    var rname = 'readtest.nc';
    describe('Checking values from ' + rname, function () {
        function ival(idx) {
            var k = 1, o = 0, j;
            for (j = 0; j < idx.length; j++) {
                o += k*idx[j];
                k *= 10;
            }
            return o;
        }
        function checkVar(A, shp, m) {
            var iu, ix, iy, iz, iw, i, val;
            i = 0;
            for (iu = 0; iu < shp[0]; iu++) {
                for (ix = 0; ix < shp[1]; ix++) {
                    for (iy = 0; iy < shp[2]; iy++) {
                        for (iz = 0; iz < shp[3]; iz++) {
                            for (iw = 0; iw < shp[4]; iw++) {
                                val = ival([iu,ix,iy,iz,iw]) % m;
                                A[i++].should.equal(val);
                            }
                        }
                    }
                }
            }
        }
        NcFile.read('test/data/' + rname, function (f) {
            if (f.constructor !== NcFile) {
                throw f;
            }
            it('i1', function (done) {
                f.variables.i1.read(function (data) {
                    checkVar(data, f.variables.i1.shape, Math.pow(2, 7));
                    done();
                });
            });
            it('i2', function (done) {
                f.variables.i2.read(function (data) {
                    checkVar(data, f.variables.i2.shape, Math.pow(2, 15));
                    done();
                });
            });
            it('i4', function (done) {
                f.variables.i4.read(function (data) {
                    checkVar(data, f.variables.i4.shape, Math.pow(2, 31));
                    done();
                });
            });
            it('f4', function (done) {
                f.variables.f4.read(function (data) {
                    checkVar(data, f.variables.f4.shape, Math.pow(2, 63));
                    done();
                });
            });
            it('f8', function (done) {
                f.variables.f8.read(function (data) {
                    checkVar(data, f.variables.f8.shape, Math.pow(2, 63));
                    done();
                });
            });
        });
    });
});
