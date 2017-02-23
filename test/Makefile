#
# Makefile for Canarium test
#

FPGA_DIR = peridot_classic
PROJECT  = swi_testsuite
REVISION = swi_testsuite
BSP_TYPE = hal
SRC_DIR  = target

RBF      = $(FPGA_DIR)/output_files/$(REVISION).rbf
SOPCINFO = $(FPGA_DIR)/$(REVISION)_core.sopcinfo

BSP_DIR  = $(FPGA_DIR)/software/$(REVISION)_bsp
BSP_GEN  = $(BSP_DIR)/system.h
BSP_LIB  = $(BSP_DIR)/lib$(BSP_TYPE)_bsp.a
BSP_PKGS = peridot_rpc_server

APP_DIR  = $(FPGA_DIR)/software/$(REVISION)_%
APP_MAKE = $(APP_DIR)/Makefile
ELF_NAME = test.elf
APP_ELF  = $(APP_DIR)/$(ELF_NAME)

RPCSRV_DIR = $(subst %,rpcsrv,$(APP_DIR))
RPCSRV_ELF = $(RPCSRV_DIR)/$(ELF_NAME)

QUARTUS_SH = $(QUARTUS_ROOTDIR)/bin/quartus_sh
NIOS2_BIN  = $(QUARTUS_ROOTDIR)/../nios2eds/sdk2/bin

Q ?= @

.PHONY: test
test:
	$(Q)npm test

.PHONY: data
data: $(RBF) $(RPCSRV_ELF)

.PHONY: clean
clean:
	$(Q)$(MAKE) -C $(BSP_DIR) $@
	$(Q)$(MAKE) -C $(RPCSRV_DIR) $@

.PHONY: clobber
clobber:
	$(Q)rm -rf $(addprefix $(FPGA_DIR)/,db incremental_db output_files software)

$(RBF) $(SOPCINFO): $(QUARTUS_SH)
	$(info Info: Compiling FPGA design (This may take a while...))
	$(Q)(cd $(FPGA_DIR) && \
		$(QUARTUS_SH) --flow compile $(PROJECT) -c $(REVISION)) \
		> $(FPGA_DIR)/$(REVISION).log
	$(Q)test -f $@

$(BSP_GEN): $(RBF) $(NIOS2_BIN)
	$(info Info: Generating BSP)
	$(Q)mkdir -p $(@D)
	$(Q)$(NIOS2_BIN)/nios2-bsp \
		hal $(@D) $(SOPCINFO) \
		$(addprefix --cmd enable_sw_package ,$(BSP_PKGS)) \
		> $(@D)/generate.log
	$(Q)test -f $@

$(BSP_LIB): $(BSP_GEN)
	$(info Info: Building BSP)
	$(Q)$(MAKE) -C $(@D) > $(@D)/build.log

.PRECIOUS: $(APP_MAKE)
$(APP_MAKE): $(SRC_DIR)/%.c $(BSP_GEN) $(NIOS2_BIN)
	$(info Info: Generating test application [$*])
	$(Q)mkdir -p $(@D)
	$(Q)cp $< $(@D)/
	$(Q)$(NIOS2_BIN)/nios2-app-generate-makefile \
		--app-dir $(@D) \
		--bsp-dir $(BSP_DIR) \
		--elf-name $(ELF_NAME) \
		--set DISABLE_ELFPATCH 1 \
		--src-files $*.c > $(@D)/generate.log

$(APP_ELF): $(APP_MAKE) $(BSP_LIB)
	$(info Info: Building test application [$*])
	$(Q)$(MAKE) -C $(@D) > $(@D)/build.log

$(QUARTUS_SH) $(NIOS2_BIN):
	$(error QUARTUS_ROOTDIR must be defined to compile test suite)

