
var chai = require('chai');
var expect = chai.expect;
chai.should();

var libpath = process.env['NETCDFJS_COV'] ? '../scripts-cov' : '../scripts';
var OMap = require(libpath + '/orderedmap.js');

function meta(foo, arg1, arg2, arg3, arg4) {
    return function () {
        return foo(arg1, arg2, arg3, arg4);
    }
}

function MyClass(val) {
    this.value = val;
    this.toString = function () { return this.value.toString(); }
}
function isMyClass(v) {
    return v.constructor === MyClass;
}

describe('orderedMap', function () {
    function testType(valueCheck, valueMap) {
        var o = new OMap(valueCheck);
        var keys = [], values = [];
        function checkKeyValues() {
            o.keys.should.eql(keys)
            o.values.should.eql(values)
            o.length.should.equal(keys.length)
            o.get(0).should.eql(values[0])
            o.toString('  ').should.be.a('string').with.length.above(o.length);
            o.toString().should.be.a('string').with.length.above(o.length);
            o.toLines().should.be.an.instanceOf(Array)
            o.toLines('foo').should.have.length.at.least(o.length)
        }
        for (var key in valueMap) {
            keys.push(key);
            values.push(valueMap[key]);
            o.append(key, valueMap[key]);
        }
        checkKeyValues()
        
        valueMap.should.eql(o.toObject());
        
        // remove an element by index
        o.remove(1);
        keys.splice(1,1);
        values.splice(1,1);
        checkKeyValues()
        
        // remove an element by key
        o.remove(keys[2])
        keys.splice(2,1)
        values.splice(2,1)
        checkKeyValues()
        
        // remove an element by value
        o.remove(values[0])
        keys.splice(0,1)
        values.splice(0,1)
        checkKeyValues()
        
    }
    it('test necessary methods and properties', function (done) {
        var o = new OMap();
        o.should.have.property('append')
        o.should.have.property('indexOf')
        o.should.have.property('keyOf')
        o.should.have.property('remove')
        o.should.have.property('length')
        o.should.have.property('get')
        o.should.have.property('keys')
        o.should.have.property('values')
        o.should.have.property('toString')
        o.should.have.property('toObject')
        o.should.have.property('headerSize')
        o.should.have.property('writeHeader')
        done()
    })
    it('test ordered map of arrays', function (done) {
        var valueMap = {
            'a': [0],
            'b': ['b'],
            'c': [1,2,3],
            'd': ['a',1,44.1],
            'key': [],
            'foo': [function () {return 0;}, function () {return 1;}],
            'bar': [undefined, null, 0, false],
            'true': [true, 1, {}, 'true', [1]]
        }
        testType(Array.isArray, valueMap)
        done()
    })
    it('test ordered map of a simple class', function (done) {
        var vals = {
            'a': new MyClass('a'),
            'b': new MyClass('b'),
            'c': new MyClass('c'),
            'akey': new MyClass(0),
            'anotherkey': new MyClass('a value'),
            'foo': new MyClass(function () {return false;}),
            'bar': new MyClass(3.14159),
            '0': new MyClass(0),
            '1': new MyClass(1),
            'seven': new MyClass(7)
        };
        testType(isMyClass, vals);
        done();
    })
    it('test toString method', function (done) {
        o = new OMap();
        o.append('aaa', new MyClass('value1'));
        o.append('bbb', new MyClass('value2'));
        o.append('ccc', new MyClass('value3'));
        o.append('0', new MyClass(0));
        o.toString().should.equal('aaa = value1 ;\nbbb = value2 ;\nccc = value3 ;\n0 = 0 ;')
        o.toString('xxx').should.equal('xxxaaa = value1 ;\nxxxbbb = value2 ;\nxxxccc = value3 ;\nxxx0 = 0 ;')
        o.keysToLines().join("\n").should.equal('aaa\nbbb\nccc\n0')
        o.valuesToLines().join("\n").should.equal('value1\nvalue2\nvalue3\n0')
        done()
    })
    it('test failure conditions', function (done) {
        var obj = [undefined];
        var o = new OMap(function (a) {return a !== obj;});
        meta(o.append, 0, []).should.throw(Error, undefined, 'non string key');
        meta(o.append, '0', '0').should.throw(Error, undefined, 'string value');
        meta(o.append, '0', 0).should.throw(Error, undefined, 'number value');
        meta(o.append, '0', []).should.not.throw(Error, undefined, 'valid key-value pair')
        meta(o.append, '0', [0]).should.throw(Error, undefined, 'duplicate keys')
        meta(o.append, '1', obj).should.throw(Error, undefined, 'failed value type')
        meta(o.remove, 'notakey').should.throw(Error, undefined, 'remove invalid key')
        o.writeHeader.should.throw(Error, undefined, 'write header in abstract class')
        done()
    })
})
