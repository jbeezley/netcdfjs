
var chai = require('chai');
chai.should();

var libpath = process.env['NETCDFJS_COV'] ? '../src-cov' : '../src';
var types = require(libpath + '/types.js');

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
    
                done();
            });
        }
    });
    describe('char', function () {
        var validate, type;
        it('toString', function (done) {
            type = types.char;
            type.toString().should.equal('char');
            type.toString('0').should.equal('"0"');
            type.toString('this is a string').should.equal('"this is a string"');

            done(); 
        });
        it('validate', function (done) {
            var validate = types.char.validate;
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
    });
    describe('int8', function () {
        var validate, type;
        it('toString', function (done) {
            type = types.int8;
            type.toString().should.equal('int8');
            type.toString(0).should.equal('0b');
            type.toString((1 << 7) - 1).should.equal('127b');
            type.toString(-1 << 7).should.equal('-128b');

            done(); 
        });
        it('validate', function (done) {
            var validate = types.int8.validate;
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
    });
    describe('int16', function () {
        it('toString', function (done) {
            type = types.int16;
            type.toString().should.equal('int16');
            type.toString(0).should.equal('0s');
            type.toString((1 << 15) - 1).should.equal('32767s');
            type.toString(-1 << 15).should.equal('-32768s');

            done(); 
        });
        it('validate', function (done) {
            var validate = types.int16.validate;
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
    });
    describe('int32', function () {
        it('toString', function (done) {
            type = types.int32;
            type.toString().should.equal('int32');
            type.toString(0).should.equal('0');
            type.toString(0x7FFFFFFF).should.equal('2147483647');
            type.toString(-0x7FFFFFFF - 1).should.equal('-2147483648');

            done(); 
        });
        it('validate', function (done) {
            var validate = types.int32.validate;
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
    });
    describe('float32', function () {
        it('toString', function (done) {
            type = types.float32;
            type.toString().should.equal('float32');
            type.toString(0).should.equal('0.0f');
            type.toString(1.1).should.equal('1.1f');
            type.toString(-3.14159).should.equal('-3.14159f');

            done(); 
        });
        it('validate', function (done) {
            var validate = types.float32.validate;
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
    });
    describe('float64', function () {
        it('toString', function (done) {
            type = types.float64;
            type.toString().should.equal('float64');
            type.toString(0).should.equal('0.0');
            type.toString(1.1).should.equal('1.1');
            type.toString(-3.14159).should.equal('-3.14159');

            done(); 
        });
        it('validate', function (done) {
            var validate = types.float64.validate;
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
    });
});
