
if (typeof define !== 'function') {
    var define = require('amdefine')(module);
}

//netcdf3 = require('./netcdf3.js');
define(['./netcdf3.js', 'fs'], function (netcdf3, fs) {
f = new netcdf3.NcFile('NETCDF3_CLASSIC');

dim1 = f.createDimension("Times");
dim2 = f.createDimension("x", 10);
dim3 = f.createDimension("y", 15);

var1 = f.createVariable("A", "float32", ["Times"]);
var2 = f.createVariable("B", "float64", ["Times", "x"]);
var3 = f.createVariable("C", "int8", ["Times", "x", "y"]);
var4 = f.createVariable("D", "char", ["x"], "x");


var1.createAttribute("attr_string", "test");
var1.createAttribute("varAttr_string", "I am a variable attribute.");

var1.createAttribute("number_1.0", 1.0);
var1.createAttribute("number_123", [1,2,3]);
var1.createAttribute("int8_1.0", 1.0, 'int8');
var1.createAttribute("int8_456", [4,5,6], 'int8');
var1.createAttribute("int16_1.0", 1.0, 'int16');
var1.createAttribute("int16_78910", [7,8,9,10], 'int16');
var1.createAttribute("int32_1.0", 1.0, 'int32');
var1.createAttribute("int32_-1-2", [-1,-2], 'int32');
var1.createAttribute("float32_3.14159", 3.14159, 'float32');
var1.createAttribute("float32_-1.1-2.76", [-1.1,-2.76], 'float32');
var1.createAttribute("float64_3.14159", 3.14159, 'float64');
var1.createAttribute("float64_-1.1-2.76", [-1.1,-2.76], 'float64');

f.createAttribute("fileAttr_string", "I am a global attribute.");
f.createAttribute("number_1.0", 1.0);
f.createAttribute("number_123", [1,2,3]);
f.createAttribute("int8_1.0", 1.0, 'int8');
f.createAttribute("int8_456", [4,5,6], 'int8');
f.createAttribute("int16_1.0", 1.0, 'int16');
f.createAttribute("int16_78910", [7,8,9,10], 'int16');
f.createAttribute("int32_1.0", 1.0, 'int32');
f.createAttribute("int32_-1-2", [-1,-2], 'int32');
f.createAttribute("float32_3.14159", 3.14159, 'float32');
f.createAttribute("float32_-1.1-2.76", [-1.1,-2.76], 'float32');
f.createAttribute("float64_3.14159", 3.14159, 'float64');
f.createAttribute("float64_-1.1-2.76", [-1.1,-2.76], 'float64');

console.log(var1.toString('var1'));
console.log('');
console.log(var2.toString('var2'));
console.log('');
console.log(var3.toString('var3'));
console.log('');
console.log(var4.toString('var4'));
console.log('');

console.log(f.toString("test"));
console.log("\nHeader size: " + f.headerSize() + " bytes");

console.log("\nTesting writeHeader...");

var buf = f.writeHeader();
var buffer = new Buffer(buf.byteLength);
for (var i = 0; i < buf.byteLength; i++) {
    buffer[i] = buf.getUint8(i);
}

fs.writeFileSync('test.nc', buffer);
});