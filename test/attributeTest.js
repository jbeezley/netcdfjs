
var chai = require('chai');
chai.should();

var libpath = process.env['NETCDFJS_COV'] ? '../src-cov' : '../src';
var Attribute = require(libpath + '/attribute.js');
var types = require(libpath + '/types.js');

describe('Attribute', function () {
    var i;
    for (i in types) {
        it(i, function (done) {
            var n, type = types[i], a = new Attribute('attr', type);
            a.type.should.equal(type);
            a.name.should.equal('attr');
            a.getLength().should.equal(0);
            
            n = 0;
            if (type.numeric) {
                a.setValue(0, n++);
                a.setValue(-1, n++);
                a.setValue(1, n++);
            } else if (type.string) {
                a.setValue('a', n++);
                a.setValue('0', n++);
            }

            done();
        });
    }
});
