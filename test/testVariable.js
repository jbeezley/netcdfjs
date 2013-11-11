
var chai = require('chai');
chai.should();

var Variable = require('variable');
var Dimension = require('dimension');
var types = require('types');


describe('Variable', function () {
    function nrecs() { return 0; }
    var d1 = new Dimension(0, nrecs),
        d2 = new Dimension(10, nrecs),
        d3 = new Dimension(15, nrecs),
        dims = ['d1', 'd2', 'd3'],
        shp = [0, 10, 15],
        dobj = [ d1, d2, d3 ];
    function getDim(d) {
        if (d === 'd1') {
            return d1;
        } else if (d === 'd2') {
            return d2;
        } else if (d === 'd3') {
            return d3;
        }
    }
    function getDimid(d) {
        if (d === 'd1') {
            return 0;
        } else if (d === 'd2') {
            return 1;
        } else if (d === 'd3') {
            return 2;
        }
    }
    function createVariable(type, dims) {
        return new Variable(type, dims, getDimid, getDim, nrecs);
    }
    function testVariable(type, dims) {
        it(type, function (done) {
            var v = createVariable(type, dims);
            v.toString().should.be.a('string');
            v.nDims.should.equal(dims.length);
            v.dimensions.should.eql(dobj);
            v.shape.should.eql(shp);
            done();
        });
    }
    testVariable('string', dims);
    testVariable('int8', dims);
    testVariable('int16', dims);
    testVariable('int32', dims);
    testVariable('float32', dims);
    testVariable('float64', dims);
});
