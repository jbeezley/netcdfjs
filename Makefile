
test:
	@./node_modules/.bin/mocha

coverage:
	@./node_modules/.bin/mocha -R html-cov test > coverage.html


.PHONY: test
