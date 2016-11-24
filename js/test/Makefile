
NODEFLAGS =
ifneq ($(DEBUG),)
ifneq ($(DEBUG),0)
NODEFLAGS += --debug-brk
endif
endif

NPM_BIN := $(shell npm bin)
MOCHA := $(NPM_BIN)/mocha

nodejs:
	$(MOCHA) $(NODEFLAGS) --compilers coffee:coffee-script/register test.coffee

