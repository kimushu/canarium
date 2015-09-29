
TARGET = canarium.js chromeapptest.js cases.js

all: $(TARGET)
	
clean:
	rm -f $(TARGET)

canarium.js: ../canarium.js
	cp $< $@

../canarium.js:
	$(MAKE) -C $(dir $@) $(notdir $@)

%.js: %.coffee
	cat $< | coffee -b -c -s > $@ || (rm -f $@; false)

