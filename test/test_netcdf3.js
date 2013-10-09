var chai = require('chai');
var expect = chai.expect;
chai.should();

var libpath = process.env['NETCDFJS_COV'] ? '../scripts-cov' : '../scripts';
var netcdf3 = require(libpath + '/netcdf3.js');

var NcFile = netcdf3.NcFile;

var defString = 'netcdf <file> {\ndimensions:\n\tdim1 = 10 ;\n\tdim2 = 11 ;\n\tdim3 = UNLIMITED ; // (0 currently)\n\tdim4 = 2 ;\n\tdim5 = 1 ;\n\tdim6 = 2 ;\n\tdim7 = 7 ;\nvariables:\n\tchar var1(dim1, dim2) ;\n\tbyte var2(dim3, dim1, dim7) ;\n\tshort var3(dim5, dim7, dim1, dim4) ;\n\tint var4() ;\n\tfloat var5(dim3, dim1, dim2, dim4, dim5, dim6, dim7) ;\n\t\tvar5:_FillValue = 0.1f ;\n\tdouble var6(dim3) ;\n\n// global attributes:\n\t\t:attr1 = \"my value\" ;\n}';
var defDims = {
    dim1: 10,
    dim2: 11,
    dim3: undefined,
    dim4: 2,
    dim5: 1,
    dim6: 2,
    dim7: 7
};

function meta(foo, arg1, arg2, arg3, arg4) {
    return function () {
        return foo(arg1, arg2, arg3, arg4);
    }
}

var defVars = {
    var1: {
        type: 'char',
        dims: ['dim1', 'dim2'],
        fill: undefined,
        attr: {
            a1: {
                type: 'float32',
                value: [1.1, -2.1, 5]
            }
        }
    },
    var2: {
        type: 'int8',
        dims: ['dim3', 'dim1', 'dim7'],
        attr: {
            att: {
                type: 'char',
                value: 'i am an attribute'
            }
        }
    },
    var3: {
        type: 'int16',
        dims: ['dim5', 'dim7', 'dim1', 'dim4'],
        attr: {
            a1: {
                type: undefined,
                value: 2.1667
            },
            a2: {
                type: 'int8',
                value: [0,1,2,3,4,5,6,7]
            },
            a3: {
                type: 'char',
                value: ['a','b','c']
            }
        }
    },
    var4: {
        type: 'int32',
        dims: [],
        attr: {}
    },
    var5: {
        type: 'float32',
        dims: ['dim3', 'dim1', 'dim2', 'dim4', 'dim5', 'dim6', 'dim7'],
        attr: {
            c1: {
                type: 'char',
                value: 'I am a character attribute.'
            },
            i8: {
                type: 'int8',
                value: [0,8]
            },
            i16: {
                type: 'int16',
                value: 256
            },
            i32: {
                type: 'int32',
                value: 0xDEADBEEF
            },
            f32: {
                type: 'float32',
                value: [0.1, -32, -100.12]
            },
            f64: {
                type: 'float64',
                value: -99.1
            }
        },
        fill: 0.1
    },
    var6: {
        type: 'float64',
        dims: ['dim3'],
        attr: {
            attribute: {
                type: undefined,
                value: 'hello'
            }
        }
    }
};

var defAttrs = {
    attr1: {
        type: 'char',
        value: 'my value'
    }
};

function makeFile(kind, dims, vars, attrs) {
    var a, type, d, fill, v, attr, val;
    var attrName, dimName, varName;
    if (kind === undefined) {
        kind = 'NETCDF3_CLASSIC';
    }
    var f = new NcFile(kind);
    if (dims === undefined) {
        dims = defDims;
    }
    if (vars === undefined) {
        vars = defVars;
    }
    if (attrs === undefined) {
        attrs = defAttrs;
    }
    for (dimName in dims) {
        f.createDimension(dimName, dims[dimName]);
    }
    for (varName in vars) {
        v = vars[varName];
        type = v.type;
        fill = v.fill;
        d = v.dims;
        a = v.attrs;
        v = f.createVariable(varName, type, d, fill);
        for (attrName in a) {
            attr = a[attrName];
            type = attr.type;
            val = attr.value;
            v.createAttribute(attrName, val, type);
        }
    }
    for (attrName in attrs) {
        attr = attrs[attrName];
        type = attr.type;
        val = attr.value;
        f.createAttribute(attrName, val, type);
    }
    return f;
}

describe('netcdf3', function () {
    describe('NcFile', function () {
        it('test create a 32-bit file object', function (done) {
            var f = makeFile('NETCDF3_CLASSIC');
            done();
        });
        it('test create a 64-bit file object', function (done) {
            var f = makeFile('NETCDF3_64BIT');
            done();
        });
        it('test cdl string output of empty file', function (done) {
            var f = new NcFile();
            f.toString('file').should.equal('netcdf file {\ndimensions:\n\nvariables:\n\n\n// global attributes:\n\n}');
            done();
        });
        it('test cdl string of the example file', function (done) {
            makeFile().toString().should.equal(defString);
            done();
        });
        it('test cdl string of 32-bit and 64-bit files are the same', function (done) {
            makeFile('NETCDF3_CLASSIC').toString('me').should.equal(
                makeFile('NETCDF3_64BIT').toString('me')
            );
            done();
        })
        it('test get header size of empty 32-bit file', function (done) {
            var f = new NcFile('NETCDF3_CLASSIC');
            f.headerSize().should.equal(32);
            done();
        });
        it('test get header size of empty 64-bit file', function (done) {
            var f = new NcFile('NETCDF3_64BIT');
            f.headerSize().should.equal(32)
            done();
        });
        it('test get header size of the example 32-bit file', function (done) {
            makeFile('NETCDF3_CLASSIC').headerSize().should.equal(432);
            done();
        });
        it('test get header size of the example 64-bit file', function (done) {
            makeFile('NETCDF3_64BIT').headerSize().should.equal(456)
            done();
        });
        it('test duplicate dimension error', function (done) {
            var f = new NcFile();
            f.createDimension('x', 1);
            meta(f.createDimension, 'x', 1).should.throw(Error, undefined, "duplicate dimension");
            f.createDimension('y');
            meta(f.createDimension, 'x').should.throw(Error, undefined, "duplicate dimension");
            done();
        });
        it('test multiple unlimited dimensions error', function (done) {
            var f = new NcFile();
            f.createDimension('x', 1);
            f.createDimension('unlim');
            f.createDimension('y', 2);
            meta(f.createDimension, 'n').should.throw(Error, undefined, "multiple unlimited dimensions");
            f.createDimension('z', 4);
            meta(f.createDimension, 'm').should.throw(Error, undefined, "multiple unlimited dimensions");
            done();
        });
        it('test invalid record variables', function (done) {
            var f = new NcFile();
            f.createDimension('Time');
            f.createDimension('x', 10);
            f.createDimension('y', 11);
            f.createDimension('z', 12);
            f.createDimension('w', 13);
            meta(f.createVariable, 'var', 'float32', ['x', 'Time']).should.throw(Error, undefined, "invalid record variable");
            meta(f.createVariable, 'var', 'float64', ['x', 'y', 'Time']).should.throw(Error);
            meta(f.createVariable, 'var', 'int8', ['w', 'z', 'Time', 'y'], 1).should.throw(Error);
            done();
        });
        it('test creating variable with an invalid dimension', function (done) {
            var f = makeFile();
            meta(f.createVariable, 'newvar1', 'float32', ['dim1', 'dim2', 'notadim']).should.throw(Error);
            meta(f.createVariable, 'newvar2', 'float32', ['notadim']).should.throw(Error);
            meta(f.createVariable, 'newvar3', 'int8', ['notadim', 'dim4', 'dim5']).should.throw(Error);
            meta(f.createVariable, 'newvar4', 'char', ['dim4', 'notadim', 'dim5', 'alsonotadim']).should.throw(Error);
            done();
        });
        it('test duplicate variable error', function (done) {
            var f = new NcFile();
            f.createVariable('avar', 'char', []);
            meta(f.createVariable, 'avar', 'char', []).should.throw(Error, undefined, "duplicate variable");
            f.createVariable('anothervar', 'float64', []);
            meta(f.createVariable, 'avar', 'int32', []).should.throw(Error, undefined, "duplicate variable");
            done();
        });
    })
})