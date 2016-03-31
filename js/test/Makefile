
NODEFLAGS =
ifneq ($(DEBUG),)
ifneq ($(DEBUG),0)
NODEFLAGS += --debug-brk
endif
endif

nodejs:
	mocha $(NODEFLAGS) --compilers coffee:coffee-script/register test.coffee

