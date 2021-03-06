
var chai = require('chai');
chai.should();

var Variable = require('variable');
var Dimension = require('dimension');
var types = require('types');


describe('Variable', function () {
    function nrecs() { return 0; }
    var d1 = new Dimension(0, nrecs),
        d2 = new Dimension(10, nrecs),
        d3 = new Dimension(15, nrecs);
    function getDim(d) {
        if (d === 'd1') {
            return d1;
        } else if (d === 'd2') {
            return d2;
        } else if (d === 'd3') {
            return d3;
        }
    }
    function createVariable(type, dims) {
        return new Variable(type, dims, getDim, nrecs);
    }
    function testVariable(type, dims, shp) {
        describe(type + '(' + dims.join(', ') + ')', function () {
            var v = createVariable(type, dims);
            it('toString', function (done) {
                v.toString().should.be.a('string');
                done();
            });
            it('nDims', function (done) {
                v.nDims.should.equal(dims.length);
                done();
            });
            it('dimensions', function (done) {
                v.dimensions.should.eql(dims);
                done();
            });
            it('shape', function (done) {
                v.shape.should.eql(shp);
                done();
            });
            it('unlimited', function (done) {
                v.unlimited.should.equal(v.nDims > 0 && shp[0] === 0);
                done();
            });
            it('type', function (done) {
                v.type.should.equal(type);
                done();
            });
        });
    }
    function testVariableDims(type) {
        testVariable(type, ['d1', 'd2', 'd3'], [0, 10, 15]);
        testVariable(type, ['d1', 'd2'], [0, 10]);
        testVariable(type, ['d2', 'd3'], [10, 15]);
        testVariable(type, [], []);
    }
    testVariableDims('string');
    testVariableDims('int8');
    testVariableDims('int16');
    testVariableDims('int32');
    testVariableDims('float32');
    testVariableDims('float64');
});
