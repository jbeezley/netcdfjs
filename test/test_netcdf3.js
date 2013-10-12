var chai = require('chai');
var fs = require('fs');
var expect = chai.expect;
chai.should();

var libpath = process.env['NETCDFJS_COV'] ? '../scripts-cov' : '../scripts';
var netcdf3 = require(libpath + '/netcdf3.js');
var wrapDataView = require(libpath + '/wrapdataview.js');

var NcFile = netcdf3.NcFile;

var defString = "netcdf <file> {\ndimensions:\n\tdim1 = 10 ;\n\tdim2 = 11 ;\n\tdim3 = UNLIMITED ; // (0 currently)\n\tdim4 = 2 ;\n\tdim5 = 1 ;\n\tdim6 = 2 ;\n\tdim7 = 7 ;\nvariables:\n\tchar var1(dim1, dim2) ;\n\t\tvar1:a1 = 1.1f, -2.1f, 5f ;\n\tbyte var2(dim3, dim1, dim7) ;\n\t\tvar2:att = \"i am an attribute\" ;\n\tshort var3(dim5, dim7, dim1, dim4) ;\n\t\tvar3:a1 = 2.1667 ;\n\t\tvar3:a2 = 0b, 1b, 2b, 3b, 4b, 5b, 6b, 7b ;\n\t\tvar3:a3 = \"abc\" ;\n\tint var4() ;\n\tfloat var5(dim3, dim1, dim2, dim4, dim5, dim6, dim7) ;\n\t\tvar5:_FillValue = 0.1f ;\n\t\tvar5:c1 = \"I am a character attribute.\" ;\n\t\tvar5:i8 = 0b, 8b ;\n\t\tvar5:i16 = 256s ;\n\t\tvar5:i32 = 246267631 ;\n\t\tvar5:f32 = 0.1f, -32f, -100.12f ;\n\t\tvar5:f64 = -99.1 ;\n\tdouble var6(dim3) ;\n\t\tvar6:attribute = \"hello\" ;\n\n// global attributes:\n\t\t:attr1 = \"my value\" ;\n}";
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
                value: 0x0EADBEEF
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
    var a, type, d, fill, v, attr, val, b;
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
        a = v.attr;
        v = f.createVariable(varName, type, d, fill);
        for (attrName in a) {
            attr = a[attrName];
            type = attr.type;
            val = attr.value;
            b =v.createAttribute(attrName, val, type);
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
    describe('Variable', function () {
        it('test components of the Variable object', function (done) {
            var files = [ new NcFile('NETCDF3_CLASSIC'),
                          new NcFile('NETCDF3_64BIT') ];
            var i, f, v, dims, sizes;
            for (i = 0; i < files.length; i++) {
                dims = ['x', 'y'];
                sizes = [11, 13];
                type = 'float64';
                f = files[i];

                f.createDimension(dims[0], sizes[0]);
                f.createDimension(dims[1], sizes[1]);
                v = f.createVariable('var', type, dims);
                v.should.have.property('dimensions').eql(dims);
                v.should.have.property('attributes').eql({});
                v.should.have.property('shape').eql(sizes);
                v.should.have.property('size').equal(sizes.reduce(function (v,w) {return v*w;}));
                v.should.have.property('isRecordVariable').equal(false);
                v.should.have.property('fill_value');
                v.should.have.property('recsize').equal(8 * sizes.reduce(function (v,w) {return v*w;}))
                v.toString().should.equal('double (x, y) ;');
                v.toString('var').should.equal('double var(x, y) ;');
                v.toString('var', 'xxx').should.equal('xxxdouble var(x, y) ;');
                v.toString(undefined, 'xxx').should.equal('xxxdouble (x, y) ;');
                v.should.have.property('createAttribute');
                v.should.have.property('headerSize');
                v.should.have.property('writeHeader');
                
                type = 'int32'
                dims = ['t'].concat(dims);
                sizes = [0].concat(sizes);
                f.createDimension('t');
                v = f.createVariable('var1', type, dims, 0);
                v.createAttribute('attr', 1.0, 'float32');
                v.should.have.property('dimensions').eql(dims);
                v.should.have.property('attributes').with.property('attr');
                v.should.have.property('shape').eql(sizes);
                v.should.have.property('size').equal(sizes.reduce(function (v,w) {return v*w;}));
                v.should.have.property('isRecordVariable').equal(true);
                v.should.have.property('fill_value');
                sizes[0] = 1;
                v.should.have.property('recsize').equal(4 * sizes.reduce(function (v,w) {return v*w;}));
                v.toString().should.equal('int (t, x, y) ;\n\t:_FillValue = 0 ;\n\t:attr = 1f ;');
                v.toString('var').should.equal('int var(t, x, y) ;\n\tvar:_FillValue = 0 ;\n\tvar:attr = 1f ;');
                v.toString('var', 'x').should.equal('xint var(t, x, y) ;\nxxvar:_FillValue = 0 ;\nxxvar:attr = 1f ;');
                v.toString(undefined, 'x').should.equal('xint (t, x, y) ;\nxx:_FillValue = 0 ;\nxx:attr = 1f ;');
                v.should.have.property('headerSize');
                v.should.have.property('writeHeader');
            }
            done();
        });
    })
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
            makeFile('NETCDF3_CLASSIC').headerSize().should.equal(752);
            done();
        });
        it('test get header size of the example 64-bit file', function (done) {
            makeFile('NETCDF3_64BIT').headerSize().should.equal(776)
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
        it('test invalid file format', function (done) {
            meta(makeFile, 'xxx').should.throw(Error, "Invalid file format.");
            done();
        });
        it('test write header call', function (done) {
            var f = makeFile();
            var buffer = f.writeHeader();
            f = makeFile('NETCDF3_64BIT');
            buffer = f.writeHeader();
            f = new NcFile();
            buffer = f.writeHeader();
            f = new NcFile('NETCDF3_64BIT');
            buffer = f.writeHeader();
            done();
        })
        it('test invalid variable name', function (done) {
            var f = new NcFile();
            var err = 'Invalid variable name.'
            meta(f.createVariable, '', 'int8', []).should.throw(Error, err);
            meta(f.createVariable, undefined, 'float32', []).should.throw(Error, err);
            meta(f.createVariable, {}, 'float64', []).should.throw(Error, err);
            meta(f.createVariable, 0, 'int32', []).should.throw(Error, err);
            done();
        });
        it('test invalid dimension name', function (done) {
            var f = new NcFile();
            var err = 'Invalid dimension name.'
            meta(f.createDimension, '', 1).should.throw(Error, err);
            meta(f.createDimension, undefined, 1).should.throw(Error, err);
            meta(f.createDimension, {}, 1).should.throw(Error, err);
            meta(f.createDimension, 0, 1).should.throw(Error, err);
            done();
        });
        it('test copy method', function (done) {
            var f = makeFile('NETCDF3_64BIT');
            var g = f.copy('NETCDF3_CLASSIC');
            var h = f.copy('NETCDF3_64BIT');
            var j = f.copy();
            f.toString().should.equal(g.toString());
            f.toString().should.equal(h.toString());
            f.toString().should.equal(j.toString());;
            done();
        });
    })
})

function readFileAsArrayBuffer(fileName) {
    var data = fs.readFileSync(fileName);
    var buffer = new ArrayBuffer(data.length);
    var view = new DataView(buffer);
    var i;
    for (i = 0; i < data.length; i++) {
        view.setUint8(i, data.readUInt8(i));
    }
    return view;
}

describe('netcdf3 read/write', function () {
    it('test read/write header of an empty file', function (done) {
        var fwrite = new NcFile(), fread, buffer;
        buffer = fwrite.writeHeader();
        fread = NcFile.readHeader(buffer);
        fread.toString().should.equal(fwrite.toString());
        done();
    });
    it('test read/write header of the example file', function (done) {
        var fwrite = makeFile(), fread, buffer;
        buffer = fwrite.writeHeader();
        fread = NcFile.readHeader(buffer);
        fread.toString().should.equal(fwrite.toString());
        done();
    });
    it('test read method', function (done) {
        var f = makeFile();
        var A = f.variables.var1.read(0);
        done();
    });
    it('test read of an empty file', function (done) {
        var data = readFileAsArrayBuffer('test/empty.nc');
        var f = NcFile.readHeader(data);
        var g = new NcFile();
        f.toString().should.equal(g.toString());
        done();
    });
    var files = ['ref_ctest1_nc4.nc'], file;
    for (var i = 0; i < files.length; i++) {
        file = files[i];
        it('test read ' + file, function (done) {
            
            var data = readFileAsArrayBuffer('test/cdl/' + file);
            var f = NcFile.readHeader(data);
            f.toString();
            done();
        });
    }
})