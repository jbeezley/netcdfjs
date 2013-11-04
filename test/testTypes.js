
var chai = require('chai');
chai.should();

var libpath = process.env['NETCDFJS_COV'] ? '../src-cov' : '../src';
var types = require(libpath + '/types.js');

function checkReadWrite(buffer, type, value, precision) {
    var val;
    type.write(0, buffer, value);
    val = type.read(0, buffer, value.length);
    if (precision === undefined) {
        val.should.eql(value);
    } else {
        Number(val.toPrecision(precision)).should.eql(value);
    }

}

describe('types', function () {
    describe('test properties', function () {
        var i, type;
        for (i in types) {
            it(i.toString(), function (done) {
                type = types[i];
                type.should.have.property('type').that.is.a('string');
                type.should.have.property('ncType').that.is.a('string');
                type.should.have.property('id').that.is.a('number').above(0);
                type.should.have.property('size').that.is.a('number').above(0);
                type.should.have.property('fill').that.is.a('string').and.length(type.size);
                type.should.have.property('cdlType').that.is.a('string');
                type.should.have.property('toString');
                type.should.have.property('validate');
                type.should.have.property('read');
                type.should.have.property('write');
                Object.isSealed(type).should.equal(true);
                done();
            });
        }
    });
    describe('char', function () {
        var type = types.char;
        it('toString', function (done) {
            type.toString().should.equal('char');
            type.toString('0').should.equal('"0"');
            type.toString('this is a string').should.equal('"this is a string"');

            done(); 
        });
        it('validate', function (done) {
            var validate = type.validate;
            validate(0).should.equal(false);
            validate(1).should.equal(false);
            validate(-1).should.equal(false);
            validate(1.1).should.equal(false);
            validate(-0.12).should.equal(false);
            validate('a').should.equal(true);
            validate('\x00\x01\x02').should.equal(true);
            validate().should.equal(false);
            validate([0]).should.equal(false);
            validate(NaN).should.equal(false);
            validate(Infinity).should.equal(false);
            done();
        });
        it('read/write', function (done) {
            var buffer = DataView(ArrayBuffer(128)), i;
            var values = ['', ' ', '\x00', '\xFF', 'this is a string', ' \xF8a\xA0\x00b\x33111'];
            for (i = 0; i < values.length; i++) {
                checkReadWrite(buffer, type, values[i]);
            }

            done();
        });
    });
    describe('int8', function () {
        var type = types.int8;
        it('toString', function (done) {
            type.toString().should.equal('int8');
            type.toString(0).should.equal('0b');
            type.toString((1 << 7) - 1).should.equal('127b');
            type.toString(-1 << 7).should.equal('-128b');

            done(); 
        });
        it('validate', function (done) {
            var validate = type.validate;
            validate(0).should.equal(true);
            validate(1).should.equal(true);
            validate(-1).should.equal(true);
            validate(1.1).should.equal(false);
            validate(-0.12).should.equal(false);
            validate('a').should.equal(false);
            validate().should.equal(false);
            validate([0]).should.equal(false);
            validate(NaN).should.equal(false);
            validate(Infinity).should.equal(false);
            done();
        });
        it('read/write', function (done) {
            var buffer = DataView(ArrayBuffer(128)), i;
            var values = [0, 1, -1, 0x7F, -0x80];
            for (i = 0; i < values.length; i++) {
                checkReadWrite(buffer, type, values[i]);
            }

            done();
        });
    });
    describe('int16', function () {
        var type = types.int16;
        it('toString', function (done) {
            type.toString().should.equal('int16');
            type.toString(0).should.equal('0s');
            type.toString((1 << 15) - 1).should.equal('32767s');
            type.toString(-1 << 15).should.equal('-32768s');

            done(); 
        });
        it('validate', function (done) {
            var validate = type.validate;
            validate(0).should.equal(true);
            validate(1).should.equal(true);
            validate(-1).should.equal(true);
            validate(1.1).should.equal(false);
            validate(-0.12).should.equal(false);
            validate('a').should.equal(false);
            validate().should.equal(false);
            validate([0]).should.equal(false);
            validate(NaN).should.equal(false);
            validate(Infinity).should.equal(false);
            done();
        });
        it('read/write', function (done) {
            var buffer = DataView(ArrayBuffer(128)), i;
            var values = [0, 1, -1, 0x7F, -0x80, 0x7FFF, -0x8000];
            for (i = 0; i < values.length; i++) {
                checkReadWrite(buffer, type, values[i]);
            }

            done();
        });
    });
    describe('int32', function () {
        var type = types.int32;
        it('toString', function (done) {
            type.toString().should.equal('int32');
            type.toString(0).should.equal('0');
            type.toString(0x7FFFFFFF).should.equal('2147483647');
            type.toString(-0x7FFFFFFF - 1).should.equal('-2147483648');

            done(); 
        });
        it('validate', function (done) {
            var validate = type.validate;
            validate(0).should.equal(true);
            validate(1).should.equal(true);
            validate(-1).should.equal(true);
            validate(1.1).should.equal(false);
            validate(-0.12).should.equal(false);
            validate('a').should.equal(false);
            validate().should.equal(false);
            validate([0]).should.equal(false);
            validate(NaN).should.equal(false);
            validate(Infinity).should.equal(false);
            done();
        });
        it('read/write', function (done) {
            var buffer = DataView(ArrayBuffer(128)), i;
            var values = [0, 1, -1, 0x7F, -0x80, 0x7FFF, -0x8000, 0x7FFFFFFF, -0x80000000];
            for (i = 0; i < values.length; i++) {
                checkReadWrite(buffer, type, values[i]);
            }

            done();
        });
    });
    describe('float32', function () {
        var type = types.float32;
        it('toString', function (done) {
            type.toString().should.equal('float32');
            type.toString(0).should.equal('0.0f');
            type.toString(1.1).should.equal('1.1f');
            type.toString(-3.14159).should.equal('-3.14159f');

            done(); 
        });
        it('validate', function (done) {
            var validate = type.validate;
            validate(0).should.equal(true);
            validate(1).should.equal(true);
            validate(-1).should.equal(true);
            validate(1.1).should.equal(true);
            validate(-0.12).should.equal(true);
            validate('a').should.equal(false);
            validate().should.equal(false);
            validate([0]).should.equal(false);
            validate(NaN).should.equal(false);
            validate(Infinity).should.equal(false);
            done();
        });
        it('read/write', function (done) {
            var buffer = DataView(ArrayBuffer(128)), i;
            var values = [0, 1, -1, 0x7F, -0x80, 0x7FFF, -0x8000, 
                          1e-32, 3.14159, -1.112e31];
            for (i = 0; i < values.length; i++) {
                checkReadWrite(buffer, type, values[i], 7);
            }

            done();
        });
    });
    describe('float64', function () {
        var type = types.float64;
        it('toString', function (done) {
            type.toString().should.equal('float64');
            type.toString(0).should.equal('0.0');
            type.toString(1.1).should.equal('1.1');
            type.toString(-3.14159).should.equal('-3.14159');

            done(); 
        });
        it('validate', function (done) {
            var validate = type.validate;
            validate(0).should.equal(true);
            validate(1).should.equal(true);
            validate(-1).should.equal(true);
            validate(1.1).should.equal(true);
            validate(-0.12).should.equal(true);
            validate('a').should.equal(false);
            validate().should.equal(false);
            validate([0]).should.equal(false);
            validate(NaN).should.equal(false);
            validate(Infinity).should.equal(false);
            done();
        });
        it('read/write', function (done) {
            var buffer = DataView(ArrayBuffer(128)), i;
            var values = [0, 1, -1, 0x7F, -0x80, 0x7FFF, -0x8000, 0x7FFFFFFF, -0x80000000,
                          1e-32, 3.14159, -1.112e31];
            for (i = 0; i < values.length; i++) {
                checkReadWrite(buffer, type, values[i]);
            }

            done();
        });
    });
});
