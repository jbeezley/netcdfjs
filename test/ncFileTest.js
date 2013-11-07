
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

function testReadWriteFile(fileName, obj) {
    var f, g;
    f = NcFile.fromObject(fileName, obj);
    f.close();
    g = new NcFile(fileName, 'r');
    g.toObject().should.eql(f.toObject());
    //g.toString().should.eql(f.toString());
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
    it('Test WRF-like file', function (done) {
        var obj = {
            dimensions: {
                Time: 0,
                DateStrLen: 19,
                west_east: 41,
                south_north: 43,
                bottom_top: 40,
                bottom_top_stag: 41,
                west_east_stag: 42,
                south_north_stag: 44,
                west_east_subgrid: 420,
                south_north_subgrid: 440
            },
            variables: {
                Times: {
                    dimensions: ['Time', 'DateStrLen'],
                    type: 'char'
                },
                LU_INDEX: {
                    dimensions: ['Time', 'south_north', 'west_east'],
                    type: 'float32',
                    attributes: {
                        FieldType: { value: 104, type: 'int32' },
                        MemoryOrder: { value: "XY ", type: 'char' },
                        description: { value: "LAND USE CATEGORY", type: 'char' },
                        units: { value: "", type: 'char' },
                        stagger: { value: "", type: 'char' }
                    }
                },
                ZNU: {
                    dimensions: ['Time', 'bottom_top'],
                    type: 'float32',
                    attributes: {
                        FieldType: { value: 104, type: 'int32' },
                        MemoryOrder: { value: "Z ", type: 'char' },
                        description: { value: "eta values of half (mass) levels", type: 'char' },
                        units: { value: "", type: 'char' },
                        stagger: { value: "", type: 'char' }
                    }
                },
                U: {
                    dimensions: ['Time', 'bottom_top', 'south_north', 'west_east_stag'],
                    type: 'float32',
                    attributes: {
                        FieldType: { value: 104, type: 'int32' },
                        MemoryOrder: { value: "XYZ", type: 'char' },
                        description: { value: "x-wind component", type: 'char' },
                        units: { value: "m s-1", type: 'char' },
                        stagger: { value: "X", type: 'char' },
                        coordinates: { value: "XLONG_U XLAT_U", type: 'char' }
                    }
                },
                V: {
                    dimensions: ['Time', 'bottom_top', 'south_north_stag', 'west_east'],
                    type: 'float32',
                    attributes: {
                        FieldType: { value: 104, type: 'int32' },
                        MemoryOrder: { value: "XYZ", type: 'char' },
                        description: { value: "y-wind component", type: 'char' },
                        units: { value: "m s-1", type: 'char' },
                        stagger: { value: "Y", type: 'char' },
                        coordinates: { value: "XLONG_V XLAT_V", type: 'char' }
                    }
                },
                W: {
                    dimensions: ['Time', 'bottom_top_stag', 'south_north', 'west_east'],
                    type: 'float32',
                    attributes: {
                        FieldType: { value: 104, type: 'int32' },
                        MemoryOrder: { value: "XYZ", type: 'char' },
                        description: { value: "z-wind component", type: 'char' },
                        units: { value: "m s-1", type: 'char' },
                        stagger: { value: "Z", type: 'char' },
                        coordinates: { value: "XLONG XLAT", type: 'char' }
                    }
                },
                GRNHFX: {
                    dimensions: ['Time', 'south_north', 'west_east'],
                    type: 'float32',
                    attributes: {
                        FieldType: { value: 104, type: 'int32' },
                        MemoryOrder: { value: "XY ", type: 'char' },
                        description: { value: "head flux from ground fire", type: 'char' },
                        units: { value: "W/m^2", type: 'char' },
                        stagger: { value: "Z", type: 'char' },
                        coordinates: { value: "XLONG XLAT", type: 'char' }
                    }
                },
                FGRNHFX: {
                    dimensions: ['Time', 'south_north_subgrid', 'west_east_subgrid'],
                    type: 'float32',
                    attributes: {
                        FieldType: { value: 104, type: 'int32' },
                        MemoryOrder: { value: "XY ", type: 'char' },
                        description: { value: "head flux from ground fire", type: 'char' },
                        units: { value: "W/m^2", type: 'char' },
                        stagger: { value: "Z", type: 'char' },
                        coordinates: { value: "XLONG XLAT", type: 'char' }
                    }
                }
            }
        };
        testReadWriteFile('wrf.nc', obj);

        done();
    });
    it('Test types', function (done) {
        var attrs = {
            attrchar  : { value: '0: \x00, 1: \x01 2: \x02', type: 'char' },
            attrint8  : { value: [0, 1, 2, 3, -1, -2, -3, -4], type: 'int8' },
            attrint16 : { value: [1, -1, 0, 127], type: 'int16' },
            attrint32 : { value: [1, -1, 0, -0x7FFFFFFF-1, 0x7FFFFFFF], type: 'int32' },
            attrfloat32 : { value: [0, 1, -1, 3,14159, 1e-32, -7.12e31], type: 'float32' },
            attrfloat64 : { value: 1.1e300, type: 'float64' }
        };
        var obj = {
            dimensions: {
                'unlimited': 0,
                'nx': 10,
                'ny': 7
            },
            attributes: attrs,
            variables: {
                varchar: {
                    dimensions: ['unlimited', 'ny', 'nx'],
                    type: 'char',
                    attributes: attrs
                },
                varint8: {
                    dimensions: ['unlimited'],
                    type: 'int8',
                    attributes: attrs
                },
                varint16: {
                    dimensions: ['ny', 'nx'],
                    type: 'int16',
                    attributes: attrs
                },
                varint32: {
                    dimensions: ['nx'],
                    type: 'char',
                    attributes: attrs
                },
                varfloat32: {
                    dimensions: ['ny'],
                    type: 'float32',
                    attributes: attrs
                },
                varfloat64: {
                    dimensions: [],
                    type: 'float64',
                    attributes: attrs
                }
            }
        };
        testReadWriteFile('types.nc', obj);

        done();
    });
});
