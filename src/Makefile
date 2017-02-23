TARGETS = ../canarium.js ../canarium.min.js
SOURCE = \
	header.coffee \
	canarium.coffee \
	basecomm.coffee serialwrapper.coffee i2ccomm.coffee \
	avspackets.coffee avmtransactions.coffee \
	remoteerror.coffee rpcclient.coffee \
	footer.coffee
PREAMBLE = license.js
JS_TYPES = ArrayBuffer Buffer chrome.serial Uint8Array DirectoryEntry Promise SerialPort
NPM_BIN := $(shell npm bin)
UGLIFYJS := $(NPM_BIN)/uglifyjs
JSONFILT := $(NPM_BIN)/jsonfilter

version := $(shell echo $$(cat ../package.json | $(JSONFILT) "version" | sed -e 's/"//g'))
replace_ver := sed -e 's/__VERSION__/$(version)/'

comma := ,
empty :=
space := $(empty) $(empty)

target_backup = (test ! -e ../$@ || ($(target_cleanup) && mv ../$@ ../.bak-$@))
target_rollback = (test ! -e ../.bak-$@ || (rm -r ../$@ && mv ../.bak-$@ ../$@))
target_update = (test ! -e ../.bak-$@/.git || (mv ../.bak-$@/.git ../$@/ && git -C ../$@ add --all .))
target_cleanup = (test ! -e ../.bak-$@ || rm -r ../.bak-$@)

compile:

.PHONY: all
all: compile doc test

.PHONY: compile
compile: $(TARGETS)

.PHONY: doc
doc: $(firstword $(TARGETS))
	$(target_backup)
	jsduck \
		--output ../$@ \
		--welcome=welcome.html \
		--external=$(subst $(space),$(comma),$(JS_TYPES)) $< \
		--warnings=-global \
		|| ($(target_rollback); false)
	$(target_update)
	$(target_cleanup)

.PHONY: clean
clean:
	rm -f $(TARGETS)
	rm -rf ../doc/*

.PHONY: test
test: compile
	$(MAKE) -C ../$@

../canarium.js: $(SOURCE) $(PREAMBLE)
	$(replace_ver) $(PREAMBLE) > $@ || (rm -f $@; false)
	$(replace_ver) $(filter %.coffee,$^) | coffee -c -s >> $@ || (rm -f $@; false)

%.min.js: %.js $(PREAMBLE)
	$(UGLIFYJS) --preamble "$$($(replace_ver) $(PREAMBLE))" -o $@ $<

