#
# PERIDOT Chrome Apps driver - 'Canarium'
# Copyright (C) 2016 @kimu_shu
#

create_sw_package canarium_serial

set_sw_property version 1.0

set_sw_property auto_initialize true
set_sw_property bsp_subdirectory drivers

# Source files
add_sw_property c_source HAL/src/canarium_serial.c
add_sw_property include_source HAL/inc/canarium_serial.h

# Supported BSP types
add_sw_property supported_bsp_type HAL
add_sw_property supported_bsp_type UCOSII
add_sw_property supported_bsp_type TINYTH

# Settings
add_sw_setting quoted_string system_h_define name CANARIUM_SERIAL_NAME "/dev/ser_canarium" "Device name"
add_sw_setting decimal_number system_h_define port_number CANARIUM_SERIAL_PORT_NUMBER 8250 "Port number"
add_sw_setting decimal_number system_h_define timeout CANARIUM_SERIAL_TIMEOUT 1000 "Timeout (in OS ticks)"
add_sw_setting boolean system_h_define override_stdin CANARIUM_SERIAL_OVERRIDE_STDIN false "Use this device as STDIN (hal.stdin must be disabled)"
add_sw_setting boolean system_h_define override_stdout CANARIUM_SERIAL_OVERRIDE_STDOUT false "Use this device as STDOUT (hal.stdout must be disabled)"
add_sw_setting boolean system_h_define override_stderr CANARIUM_SERIAL_OVERRIDE_STDERR false "Use this device as STDERR (hal.stderr must be disabled)"

# End of file
