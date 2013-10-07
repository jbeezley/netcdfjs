
var chai = require("chai");
var should = chai.should(),
    expect = chai.expect;
    
var libpath = process.env['NETCDFJS_COV'] ? '../scripts-cov' : '../scripts';
var wrapDataView = require(libpath + '/wrapdataview.js');

var metaFunction = function (foo, arg1, arg2, arg3) {
    return function () {
        foo(arg1, arg2, arg3);
    }
}

describe('main', function () {
    var buffer, view, bufferSize;
        function testTypeValue(type, value, msg) {
            var index = buffer.tell();
            buffer.write(type, value);
            buffer.seek(index);
            if (Array.isArray(value) || typeof value === 'string') {
                buffer.read(type, value.length).should.eql(value, msg);
            } else {
                buffer.read(type).should.equal(value, msg);
            }
            buffer.seek(index);
        }
        function metaTestTypeValue(type, value) {
            return metaFunction(testTypeValue, type, value);
        }
        function testFloatValue(type, value, err) {
            var index = buffer.tell(), val;
            buffer.write(type, value);
            buffer.seek(index);
            if (Array.isArray(value)) {
                for (var i = 0; i < value.length; i++) {
                    testFloatValue(type, value[i], err);
                }
            } else {
                Math.abs(buffer.read(type)).should.be.above(Math.abs(value) * (1 - err)).and.below(Math.abs(value) * (1 + err));
            }
            buffer.seek(index);
        }
        function metaTestFloatValue(type, err, value) {
            return metaFunction(testFloatValue, type, err, value);
        }
    describe('wrapdataview', function () {
        before(function () {
            bufferSize = 1024;
            view = new DataView(new ArrayBuffer(bufferSize));
            buffer = new wrapDataView(view);
        })
        it('check necessary methods', function () {
            buffer.should.have.property('read')
            buffer.should.have.property('write')
            buffer.should.have.property('seek')
            buffer.should.have.property('tell')
        })
        it('test read/write of int8 values', function () {
            var type = 'int8';
            testTypeValue(type, 0);
            testTypeValue(type, 1);
            testTypeValue(type, -1);
            testTypeValue(type, 101);
            testTypeValue(type, (0xFF >>> 1));
            testTypeValue(type, -(0xFF >>> 1) - 1);
            testTypeValue(type, [0,1,2]);
            testTypeValue(type, [-99]);
            testTypeValue(type, []);
            metaTestTypeValue(type, (0xFF >>> 1) + 1).should.throw(Error, undefined, "expected + overflow");
            metaTestTypeValue(type, -(0xFF >>> 1) - 2).should.throw(Error, undefined, "expected - overflow");
            metaTestTypeValue(type, 'a').should.throw(Error, undefined, "invalid type");
            metaTestTypeValue(type, 1.1).should.throw(Error, undefined, "expected truncation");
        })
        it('test read/write of int16 values', function () {
            var type = 'int16';
            testTypeValue(type, 0);
            testTypeValue(type, 1);
            testTypeValue(type, -1);
            testTypeValue(type, 101);
            testTypeValue(type, 200);
            testTypeValue(type, -5000);
            testTypeValue(type, (0xFFFF >>> 1))
            testTypeValue(type, -(0xFFFF >>> 1) - 1)
            testTypeValue(type, [10,11,21]);
            testTypeValue(type, [-991]);
            testTypeValue(type, []);
            metaTestTypeValue(type, (0xFFFF >>> 1) + 1).should.throw(Error, undefined, "expected + overflow");
            metaTestTypeValue(type, -(0xFFFF >>> 1) - 2).should.throw(Error, undefined, "expected - overflow");
            metaTestTypeValue(type, 'ab').should.throw(Error, undefined, "invalid type");
            metaTestTypeValue(type, 1.1).should.throw(Error, undefined, "expected truncation");
        })
        it('test read/write of int32 values', function () {
            var type = 'int32';
            testTypeValue(type, 0);
            testTypeValue(type, 1);
            testTypeValue(type, -1);
            testTypeValue(type, 101);
            testTypeValue(type, 200);
            testTypeValue(type, -5000);
            testTypeValue(type, (0xFFFF >>> 1))
            testTypeValue(type, -(0xFFFF >>> 1) - 1)
            testTypeValue(type,  (0xFFFFFFFF >>> 1))
            testTypeValue(type, -(0xFFFFFFFF >>> 1) )
            testTypeValue(type, [1,-10001,2164]);
            testTypeValue(type, [-9900001]);
            testTypeValue(type, []);
            metaTestTypeValue(type, (0xFFFFFFFF >>> 1) + 1).should.throw(Error, undefined, "expected + overflow");
            metaTestTypeValue(type, -(0xFFFFFFFF >>> 1) - 2).should.throw(Error, undefined, "expected - overflow");
            metaTestTypeValue(type, 'abcd').should.throw(Error, undefined, "invalid type");
            metaTestTypeValue(type, 1.1).should.throw(Error, undefined, "expected truncation");
        })
        it('test read/write of int64 values', function () {
            var type = 'int64';
            testTypeValue(type, 0);
            testTypeValue(type, 1);
            testTypeValue(type, -1);
            testTypeValue(type, 101);
            testTypeValue(type, 200);
            testTypeValue(type, -5000);
            testTypeValue(type, (0xFFFF >>> 1))
            testTypeValue(type, -(0xFFFF >>> 1) - 1)
            testTypeValue(type,  (0xFFFFFFFF >>> 1))
            testTypeValue(type, -(0xFFFFFFFF >>> 1) )
            testTypeValue(type, [1,-10001,2164]);
            testTypeValue(type, [-9900001]);
            testTypeValue(type, []);
            testTypeValue(type, (0xFFFFFFFFFFFF >>> 1) + 1);
            testTypeValue(type, -(0xFFFFFFFFFFFF >>> 1) - 2);
            metaTestTypeValue(type, 'abcdefgh').should.throw(Error, undefined, 'invalid type');
            metaTestTypeValue(type, 1.1).should.throw(Error, undefined, 'expected truncation');
        })
        it('test read/write of float32 values', function () {
            var type = 'float32', err = 1e-7;
            testTypeValue(type, 0);
            testTypeValue(type, 1);
            testTypeValue(type, -1);
            testTypeValue(type, 101);
            testTypeValue(type, 200);
            testTypeValue(type, -5000);
            testTypeValue(type, (0xFFFF >>> 1))
            testTypeValue(type, -(0xFFFF >>> 1) - 1)
            testTypeValue(type, [1,-10001,2164]);
            testTypeValue(type, [-9900001]);
            testTypeValue(type, []);
            testTypeValue(type, .5);
            testTypeValue(type, .25);
            testTypeValue(type, -.125);
            testFloatValue(type, .1, err);
            testFloatValue(type, [-5.11111, -.000151145, 1244.21, 1.112e-10, 5.2e12], err);
            metaTestTypeValue(type, 'abcd').should.throw(Error, undefined, 'invalid type');
            metaTestFloatValue(type, 1.1e40, err).should.throw(Error, undefined, "expected + overflow");
            metaTestFloatValue(type, -2.55e40, err).should.throw(Error, undefined, "expected - overflow");
            metaTestFloatValue(type, 1.1e-50, err).should.throw(Error, undefined, "expected + underflow");
            metaTestFloatValue(type, -2.55e-50, err).should.throw(Error, undefined, "expected - underflow");
        })
        it('test read/write of float64 values', function () {
            var type = 'float64', err = 1e-14;
            testTypeValue(type, 0);
            testTypeValue(type, 1);
            testTypeValue(type, -1);
            testTypeValue(type, 101);
            testTypeValue(type, 200);
            testTypeValue(type, -5000);
            testTypeValue(type, (0xFFFF >>> 1))
            testTypeValue(type, -(0xFFFF >>> 1) - 1)
            testTypeValue(type, [1,-10001,2164]);
            testTypeValue(type, [-9900001]);
            testTypeValue(type, []);
            testTypeValue(type, .5);
            testTypeValue(type, .25);
            testTypeValue(type, -.125);
            testTypeValue(type, 1e52);
            testTypeValue(type, -1e52);
            testTypeValue(type, .1, err);
            testFloatValue(type, 1.1e40, err);
            testFloatValue(type, -2.55e40, err);
            testFloatValue(type, 1.1e-50, err);
            testFloatValue(type, -2.55e-50, err);
            testFloatValue(type, [-5.11111, -.000151145, 1244.21, 1.112e-10, 5.2e12], err);
            metaTestTypeValue(type, 'abcdefgh').should.throw(Error, undefined, 'invalid type');
        })
        it('test read/write of strings', function () {
            var type = 'char', a = ['a', 'b', 'c', 'd', 'e' , '.', '.', '.', 'z'];
            testTypeValue(type, 'abcd');
            testTypeValue(type, '         ');
            testTypeValue(type, '   0     ');
            testTypeValue(type, '\x00\x01\x02\x03\x04');
            testTypeValue(type, '0\xAF\x10x\A');
            buffer.seek(0);
            buffer.write(type, a);
            buffer.seek(0);
            buffer.read(type, a.length).should.eql(a.join(''));
            metaTestTypeValue(type, 0).should.throw(Error, undefined, 'invalid type - int');
            metaTestTypeValue(type, 1.1).should.throw(Error, undefined, 'invalid type - float');
            metaTestTypeValue(type, { value: 'a' }).should.throw(Error, undefined, 'invalid type - object');
        })
        it('test invalid types', function () {
            metaTestTypeValue('iamnotatype', 0).should.throw(Error, "Unknown type.");
            metaFunction(buffer.read, 'i am not a type').should.throw(Error);
            metaFunction(buffer.write, 'i am not a type', 0).should.throw(Error);
        })
    }) 
})
