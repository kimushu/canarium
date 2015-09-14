.PHONY: all

all: canarium.js canarium.min.js

%.js: %.coffee
	coffee -c $<

%.min.js: %.js
	uglifyjs -o $@ $<

