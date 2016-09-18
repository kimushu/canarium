#
# PERIDOT Chrome Apps driver - 'Canarium'
# Copyright (C) 2016 @kimu_shu and J-7SYSTEM WORKS
#

create_driver peridot_swi_driver

set_sw_property hw_class_name peridot_swi
set_sw_property min_compatible_hw_version 1.1
set_sw_property version 1.1

set_sw_property auto_initialize true
set_sw_property bsp_subdirectory drivers

set_sw_property isr_preemption_supported true
set_sw_property supported_interrupt_apis "legacy_interrupt_api enhanced_interrupt_api"

# Source files
add_sw_property c_source HAL/src/peridot_swi.c
add_sw_property include_source HAL/inc/peridot_swi.h
add_sw_property include_source HAL/inc/peridot_swi_regs.h

# Supported BSP types
add_sw_property supported_bsp_type HAL
add_sw_property supported_bsp_type UCOSII
add_sw_property supported_bsp_type TINYTH

# Settings
# (no item)

# End of file
