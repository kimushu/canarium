TARGETS = canarium.js canarium.min.js
SOURCE = common.coffee canarium.coffee \
			basecomm.coffee i2ccomm.coffee \
			avspackets.coffee avmtransactions.coffee
JS_TYPES = ArrayBuffer chrome.serial Uint8Array
DOC_DIR = doc

comma := ,
empty :=
space := $(empty) $(empty)

target_backup = (test ! -e $@ || ($(target_cleanup) && mv $@ .bak-$@))
target_rollback = (test ! -e .bak-$@ || (rm -r $@ && mv .bak-$@ $@))
target_update = (test ! -e .bak-$@/.git || (mv .bak-$@/.git $@/ && git -C $@ add --all .))
target_cleanup = (test ! -e .bak-$@ || rm -r .bak-$@)

compile:

.PHONY: all
all: compile doc test

.PHONY: compile
compile: $(TARGETS)

.PHONY: doc
doc: $(firstword $(TARGETS))
	$(target_backup)
	jsduck --output $@ --external=$(subst $(space),$(comma),$(JS_TYPES)) $< || ($(target_rollback); false)
	$(target_update)
	$(target_cleanup)

.PHONY: clean
clean:
	rm -f $(TARGETS)
	rm -rf doc/*

.PHONY: test
test: compile
	$(MAKE) -C $@

canarium.js: $(SOURCE)
	cat $^ | coffee -c -b -s --no-header > $@ || (rm -f $@; false)

%.min.js: %.js
	uglifyjs -o $@ $<
