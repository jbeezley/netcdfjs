
test:
	@./node_modules/.bin/mocha -R spec

coverage:
	@jscoverage --no-highlight src src-cov
	@NETCDFJS_COV=1 ./node_modules/.bin/mocha -R html-cov > coverage.html


.PHONY: test
