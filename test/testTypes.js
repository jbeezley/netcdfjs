var chai = require('chai');
chai.should();

var types = require('types');

function meta(foo, arg1, arg2, arg3, arg4) {
    return function () {
        foo(arg1, arg2, arg3, arg4);
    };
}

function invalidToString(type, values) {
    it('Invalid toString', function (done) {
        var all = [Number.NaN, Number.NEGATIVE_INFINITY,
                   Number.POSITIVE_INFINITY, function () {},
                   {}, /\./].concat(values);
        all.forEach(function (val) {
            meta(type.toString, val).should.throw(Error, 'Invalid');
        });
        done();
    });
    it('Invalid writeData', function (done) {
        var all = [Number.NaN, Number.NEGATIVE_INFINITY,
                   Number.POSITIVE_INFINITY, function () {},
                   {}, /\./].concat(values);
        var view = new DataView(new ArrayBuffer(128));
        all.forEach(function (val) {
            meta(type.write, 0, view, val).should.throw(Error, 'Invalid');
        });
        done();
    });
};

function testReadWrite(type, value, eps) {
    var title = 'read/write value: ';
    //if (Array.isArray(value)) {
    //    title += '[ ' + type.toString(value[0]) + ', ... , ' + type.toString(value[value.length-1]) + ' ]';
    //} else {
        title += type.toString(value);
    //}
    if (title.length > 65) {
        title = title.slice(0, 45) + ' ... ' + title.slice(title.length - 20, title.length);
    }
    if (Array.isArray(value) || typeof value === 'string') {
        it('read/write array', function (done) {
            var view = new DataView(new ArrayBuffer(1024)), n, val, i;
            type.writeArray(0, view, value);
            val = type.readArray(0, view);
            if (eps === undefined) {
                val.should.eql(value);
            } else {
                val.length.should.equal(value.length);
                for (i = 0; i < value.length; i++) {
                    val[i].should.be.within(value[i] - Math.abs(value[i]) * eps, value[i] + Math.abs(value[i]) * eps);
                }
            }
            done();
        });
    }
    it(title, function (done) {
        var view = new DataView(new ArrayBuffer(1024)), n, val, i;
        type.write(0, view, value);
        if (typeof value === 'string') { n = value.length; }
        if (Array.isArray(value)) {
            val = type.read(0, view, value.length);
            val.length.should.equal(value.length);
            if (eps === undefined) {
                val.should.eql(value);
            } else {
                for (i = 0; i < val.length; i++) {
                    val[i].should.be.within(value[i] - Math.abs(value[i]) * eps, value[i] + Math.abs(value[i]) * eps);
                }
            }
        } else {
            val = type.read(0, view, n);
            if (eps === undefined) {
                val.should.equal(value);
            } else {
                val.should.be.within(value - Math.abs(value) * eps, value + Math.abs(value) * eps);
            }
        }
        done();
    });
    if (!Array.isArray(value)) {
        it('toString/fromString ' + type.toString(value), function (done) {
            var s = type.toString(value), o = types.fromString(s);
            o.type.should.equal(type);
            o.value.should.equal(value);
            done();
        });
    }
}

describe('types', function () {
    var int8values    = [1, 0, -1, 0x7F, -0x80],
        int16values   = [0x7FFF, -0x8000].concat(int8values),
        int32values   = [0x7FFFFFFF, -0x80000000].concat(int16values),
        int64values   = [0xFFFFFFFF, Math.pow(3, 30), Math.pow(2, 52)].concat(int32values),
        float32values = [Math.atan(1) * 4, Math.exp(61), -Math.exp(-32), -Math.exp(59)].concat(int64values),
        float64values = [Math.pow(2, 512), -Math.pow(3, 400), Math.pow(5, -400), -Math.pow(3, -400)].concat(float32values),
        stringvalues  = ['a', 'abcdefghijklmnopqrstuvwxyz', 'This is a string!', '\xCC\x00\x01\x02\xFF\x7F\xFE'];

    describe('int8', function () {
        var type = types.int8,
            values = int8values, i; 
        for (i = 0; i < values.length; i++) {
            testReadWrite(type, values[i]);
        }
        testReadWrite(type, values);
        it('toString()', function (done) {
            type.toString().should.equal('int8');
            done();
        });
        it('CDL type', function (done) {
            types.fromCDL(type.cdlType).should.equal(type);
            done();
        });
        invalidToString(type, [128, -129, 1.5, -2.1]);
    });
    describe('int16', function () {
        var type = types.int16,
            values = int16values, i;
        for (i = 0; i < values.length; i++) {
            testReadWrite(type, values[i]);
        }
        testReadWrite(type, values);
        it('toString()', function (done) {
            type.toString().should.equal('int16');
            done();
        });
        it('CDL type', function (done) {
            types.fromCDL(type.cdlType).should.equal(type);
            done();
        });
        invalidToString(type, [0xFFFF, -0xFFFF - 1, 1.2, -3.1]);
    });
    describe('int32', function () {
        var type = types.int32,
            values = int32values, i;
        for (i = 0; i < values.length; i++) {
            testReadWrite(type, values[i]);
        }
        testReadWrite(type, values);
        it('toString()', function (done) {
            type.toString().should.equal('int32');
            done();
        });
        it('CDL type', function (done) {
            types.fromCDL(type.cdlType).should.equal(type);
            done();
        });
        invalidToString(type, [0xFFFFFFFF, -0xFFFFFFFF - 1, 1.2, -5.1]);
    });
    describe('int64', function () {
        var type = types.int64,
            values = int64values, i, p = [];
        for (i = 0; i < values.length; i++) {
            if (values[i] >= 0) {
                p.push(values[i]);
                testReadWrite(type, values[i]);
            }
        }
        testReadWrite(type, p);
        it('toString()', function (done) {
            type.toString().should.equal('int64');
            done();
        });
        it('CDL type', function (done) {
            types.fromCDL(type.cdlType).should.equal(type);
            done();
        });
        invalidToString(type, [1.1, -0.5, Math.pow(2, 60)]);
    });
    describe('float32', function () {
        var eps = 10e-8;
        var type = types.float32,
            values = float32values, i;
        for (i = 0; i < values.length; i++) {
            testReadWrite(type, values[i], eps);
        }
        testReadWrite(type, values, eps);
        it('toString()', function (done) {
            type.toString().should.equal('float32');
            done();
        });
        it('CDL type', function (done) {
            types.fromCDL(type.cdlType).should.equal(type);
            done();
        });
        invalidToString(type, []);
    });
    describe('float64', function () {
        var type = types.float64,
            values = float64values, i;
        for (i = 0; i < values.length; i++) {
            testReadWrite(type, values[i]);
        }
        testReadWrite(type, values);
        it('toString()', function (done) {
            type.toString().should.equal('float64');
            done();
        });
        it('CDL type', function (done) {
            types.fromCDL(type.cdlType).should.equal(type);
            done();
        });
        invalidToString(type, []);
    });
    describe('string', function () {
        var type = types.string,
            values = stringvalues, i;
        for (i = 0; i < values.length; i++) {
            testReadWrite(type, values[i]);
        }
        testReadWrite(type, values.join(':'));
        it('toString()', function (done) {
            type.toString().should.equal('string');
            done();
        });
        it('CDL type', function (done) {
            types.fromCDL(type.cdlType).should.equal(type);
            done();
        });
        invalidToString(type, [1, 1.1]);
    });
    describe('Error conditions for types', function () {
        it('Invalid CDL type', function (done) {
            meta(types.fromCDL, 'notatype').should.throw(Error);
            done();
        });
        it('Invalid fromString', function (done) {
            meta(types.fromString, 'abc').should.throw(Error);
            meta(types.fromString, '.1.2').should.throw(Error);
            meta(types.fromString, '1.2l').should.throw(Error);
            meta(types.fromString, '1.2e12s').should.throw(Error);
            meta(types.fromString, '"ab').should.throw(Error);
            meta(types.fromString, '"a"b').should.throw(Error);
            meta(types.fromString, '128b').should.throw(Error);
            meta(types.fromString, '-129b').should.throw(Error);
            done();
        });
    });
});
