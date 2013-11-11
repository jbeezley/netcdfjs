
var chai = require('chai');
chai.should();

var Attribute = require('attribute');
var types = require('types');

function test(type, values) {
    it('values: ' + values.slice(0, 10), function (done) {
        var attr = new Attribute(type);
        if (type === 'string') {
            attr.toString().should.equal('""');
        } else {
            attr.toString().should.equal('');
        }
        if (values.length > 1) {
            attr.set(values[0]);
            attr.set(values[0], 1);
        }
        attr.set(values);
        attr.get().should.eql(values);
        attr.length.should.equal(values.length);
        if (values.length > 0) {
            attr.get(0).should.equal(values[0]);
        }
        attr.toString().should.be.a('string');
        done();
    });
}

function metaAttribute(type) {
    return function () {
        var a = new Attribute(type);
    }
}

function badValue(a, val) {
    it('Bad value: ' + val, function (done) {
        function meta1() {
            return function () {
                a.set(val);
            };
        }
        function meta2() {
            return function () {
                a.set(val, 0);
            };
        }
        meta1().should.throw(Error, "Invalid");
        meta2().should.throw(Error, "Invalid");
        done();
    })
}

var typeName;

describe('Attribute', function () {
    describe('string', function () {
        var values = '', i;
        typeName = 'string';
        test(typeName, 'abcd');
        test(typeName, '');
        test(typeName, '1');
        for (i = 0; i < 256; i++) {
            values += String.fromCharCode(255 - i);
        }
        test(typeName, values);
    });
    describe('int8', function () {
        var values = [], i;
        typeName = 'int8';
        test(typeName, [0]);
        test(typeName, [1]);
        test(typeName, [-1]);
        for (i = -128; i < 128; i++) {
            values.push(i);
        }
        test(typeName, values);
    });
    describe('int16', function () {
        var values = [], i;
        typeName = 'int16';
        test(typeName, [0]);
        test(typeName, [1]);
        test(typeName, [-1]);
        for (i = -128; i < 128; i++) {
            values.push(7*i);
        }
        test(typeName, values);
    });
    describe('int32', function () {
        var values = [], i;
        typeName = 'int32';
        test(typeName, [0]);
        test(typeName, [1]);
        test(typeName, [-1]);
        for (i = -128; i < 128; i++) {
            values.push(71*i);
        }
        test(typeName, values);
    });
    describe('float32', function () {
        var values = [], i;
        typeName = 'float32';
        test(typeName, [0]);
        test(typeName, [1]);
        test(typeName, [-1]);
        for (i = -128; i < 128; i++) {
            values.push(3.1*i);
        }
        test(typeName, values);
    });
    describe('float64', function () {
        var values = [], i;
        typeName = 'float64';
        test(typeName, [0]);
        test(typeName, [1]);
        test(typeName, [-1]);
        for (i = -128; i < 128; i++) {
            values.push(3.5e-4*i);
        }
        test(typeName, values);
    });
    describe('Error conditions', function () {
        it('bad type name', function (done) {
            metaAttribute('int').should.throw(Error, 'Invalid');
            metaAttribute('float').should.throw(Error, 'Invalid');
            metaAttribute(0).should.throw(Error, 'Invalid');
            metaAttribute(undefined).should.throw(Error, 'Invalid');
            
            done();
        });
        describe('string', function() {
            var a = new Attribute('string');
            badValue(a, 0);
            badValue(a, undefined);
            badValue(a, {});
            badValue(a, NaN);
            badValue(a, 1.1);
            badValue(a, Number.POSITIVE_INFINITY);
        });
        describe('int8', function() {
            var a = new Attribute('int8');
            badValue(a, 128);
            badValue(a, undefined);
            badValue(a, {});
            badValue(a, NaN);
            badValue(a, 1.1);
            badValue(a, Number.POSITIVE_INFINITY);
        });
        describe('int16', function() {
            var a = new Attribute('int16');
            badValue(a, 0xFFFF);
            badValue(a, undefined);
            badValue(a, {});
            badValue(a, NaN);
            badValue(a, 1.1);
            badValue(a, Number.POSITIVE_INFINITY);
        });
        describe('int32', function() {
            var a = new Attribute('int32');
            badValue(a, 0xFFFFFFFF);
            badValue(a, undefined);
            badValue(a, {});
            badValue(a, NaN);
            badValue(a, 1.1);
            badValue(a, Number.POSITIVE_INFINITY);
        });
        describe('float32', function() {
            var a = new Attribute('float32');
            badValue(a, undefined);
            badValue(a, {});
            badValue(a, NaN);
            badValue(a, Number.POSITIVE_INFINITY);
        });
        describe('float64', function() {
            var a = new Attribute('float64');
            badValue(a, undefined);
            badValue(a, {});
            badValue(a, NaN);
            badValue(a, Number.POSITIVE_INFINITY);
        });
    });
});

