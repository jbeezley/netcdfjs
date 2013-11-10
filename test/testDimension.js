
var chai = require('chai');
chai.should();

var Dimension = require('dimension');

describe('Dimension', function () {
    function createDimension(size) {
        it('create dimension of size ' + size, function (done) {
            var d = new Dimension(size);
            d.unlimited.should.equal(false);
            d.size.should.equal(size);
            done();
        });
    }
    function meta(size) {
        return function () {
            var d = new Dimension(size);
        }
    }
    it('create unlimited dimension', function (done) {
        var d = new Dimension(), e = new Dimension(0);
        d.unlimited.should.equal(true);
        d.size.should.equal(0);
        e.unlimited.should.equal(true);
        e.size.should.equal(0);

        done();
    });
    createDimension(1);
    createDimension(10);
    createDimension(1532);
    it('test invalid sizes', function (done) {
        var d;
        meta(-1).should.throw(Error, "Invalid");
        meta(-1000).should.throw(Error, "Invalid");
        meta('10').should.throw(Error, "Invalid");
        meta(NaN).should.throw(Error, "Invalid");
        meta(Number.POSITIVE_INFINITY).should.throw(Error, "Invalid");
        done();
    });
});
