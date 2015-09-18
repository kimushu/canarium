TARGETS = canarium.js canarium.min.js
JS_TYPES = ArrayBuffer

comma := ,
empty :=
space := $(empty) $(empty)

.PHONY: all
all: $(TARGETS)

.PHONY: doc
doc: canarium.js
	jsduck --output $@ \
		--external=$(subst $(space),$(comma),$(JS_TYPES)) \
		$(firstword $(TARGETS))

.PHONY: clean
clean:
	rm -f $(TARGETS)
	rm -rf doc

%.js: %.coffee
	coffee -c -b $<

%.min.js: %.js
	uglifyjs -o $@ $<
