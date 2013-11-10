
var chai = require('chai');
chai.should();

var Attribute = require('attribute');
var types = require('types');

function test(type, values) {
    it('values: ' + values.slice(0, 10), function (done) {
        var attr = new Attribute(type);
        attr.set(values);
        attr.get().should.eql(values);
        attr.length.should.equal(values.length);
        if (values.length > 0) {
            attr.get(0).should.equal(values[0]);
        }
        done();
    });
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
});

