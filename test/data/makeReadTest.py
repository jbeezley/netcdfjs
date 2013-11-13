from netCDF4 import Dataset
import numpy as np

def ival(i):
    k = 1
    o = 0
    for j in xrange(len(i)):
        o = o + k*i[j]
        k = k * 10
    return o

def mkVar(shp, m):
    A = np.zeros(shp).ravel()
    for j in xrange(np.prod(shp)):
        i = np.unravel_index(j, shp)
        A[j] = ival(i) % m
    return A.reshape(shp)

f = Dataset('readtest.nc', 'w', format = 'NETCDF3_CLASSIC')
f.createDimension('u')
f.createDimension('x', 5)
f.createDimension('y', 3)
f.createDimension('z', 1)
f.createDimension('w', 9)

for stype, m in (('i1', 8), ('i2', 16) , ('i4', 32), ('f4', 64), ('f8', 64)):
    v = f.createVariable(stype, stype, ('u', 'x', 'y', 'z', 'w'))
    shp = (7,) + v.shape[1:]
    v[:] = mkVar(shp, 2**(m-1))

f.sync()
f.close()

