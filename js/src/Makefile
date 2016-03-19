TARGETS = ../canarium.js ../canarium.min.js
SOURCE = \
	header.coffee endian.coffee \
	canarium.coffee errno.coffee \
	basecomm.coffee i2ccomm.coffee \
	avspackets.coffee avmtransactions.coffee \
	hostcomm.coffee port.coffee serial.coffee \
	fdport.coffee \
	footer.coffee
	# hostcomm.coffee virtualchannel.coffee virtualfdio.coffee \
	# hostfs.coffee hostnet.coffee
PREAMBLE = license.js
JS_TYPES = ArrayBuffer chrome.serial Uint8Array DirectoryEntry Promise

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
	cat /dev/null $(PREAMBLE) > $@ || (rm -f $@; false)
	cat $(filter %.coffee,$^) | coffee -c -s --no-header >> $@ || (rm -f $@; false)

%.min.js: %.js $(PREAMBLE)
	uglifyjs --preamble "$$(cat /dev/null $(PREAMBLE))" -o $@ $<

