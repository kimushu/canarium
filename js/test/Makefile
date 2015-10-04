
TARGETS = canarium.js chromeapptest.js cases.js

test: $(TARGETS)

clean:
	rm -f $(TARGETS)

canarium.js: ../canarium.js
	cp $< $@

../canarium.js:
	$(MAKE) -C $(dir $@) $(notdir $@)

%.js: %.coffee
	cat $< | coffee -b -c -s > $@ || (rm -f $@; false)

