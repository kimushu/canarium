#
# PERIDOT Chrome Apps driver - 'Canarium'
# Copyright (C) 2016 @kimu_shu
#

create_sw_package canarium_hostcomm

set_sw_property version 1.0

set_sw_property auto_initialize true
set_sw_property bsp_subdirectory drivers
set_sw_property alt_sys_init_priority 900

# Source files
add_sw_property c_source HAL/src/canarium_hostcomm.c
add_sw_property include_source HAL/inc/canarium_hostcomm.h

# Supported BSP types
add_sw_property supported_bsp_type HAL
add_sw_property supported_bsp_type UCOSII
add_sw_property supported_bsp_type TINYTH

# Settings

# End of file
