
browser: test
	@ln -sf readFileBrowser.js src/readFile.js
	browserify src/netcdf3.js -o netcdf3.js -s netcdf3

test:
	@ln -sf readFileNode.js src/readFile.js
	@NODE_PATH=./src ./node_modules/.bin/mocha -R spec

coverage:
	@ln -sf readFileNode.js src/readFile.js
	@jscoverage --no-highlight src src-cov
	@NETCDFJS_COV=1 NODE_PATH=./src-cov ./node_modules/.bin/mocha -R html-cov > coverage.html


.PHONY: test coverage browser
