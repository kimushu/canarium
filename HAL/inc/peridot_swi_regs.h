/*
 * Canarium: HAL side of PERIDOT board driver
 *
 * This source code is distributed under The MIT License (MIT).
 * See LICENSE file in the root directory of this project.
 */

#ifndef __PERIDOT_SWI_REGS_H__
#define __PERIDOT_SWI_REGS_H__

#include <stddef.h>
#include "alt_types.h"

#define PERIDOT_SWI_RESET_KEY   0xdead  // FIXME

union peridot_swi_reset_reg
{
  struct {
    alt_u32 rst     : 1;
    alt_u32 led     : 1;
    alt_u32         : 13;
    alt_u32 uidena  : 1;
    alt_u32 key     : 16;
  };
  alt_u32 word;
};

union peridot_swi_flash_reg
{
  struct {
    alt_u32 rxdata  : 8;
    alt_u32 ss      : 1;
    alt_u32 rdy     : 1;
    alt_u32         : 5;
    alt_u32 irqena  : 1;
    alt_u32         : 16;
  };
  struct {
    alt_u32 txdata  : 8;
    alt_u32         : 1;
    alt_u32 sta     : 1;
    alt_u32         : 5;
    alt_u32         : 1;
    alt_u32         : 16;
  };
  alt_u32 word;
};

struct peridot_swi_regs
{
  /* System ID (altera_avalon_sysid compatible) */
  alt_u32 id;
  alt_u32 timestamp;

  /* Unique chip ID */
  alt_u32 uid_low;
  alt_u32 uid_high;

  /* Reset status */
  union peridot_swi_reset_reg reset;

  /* Flash access */
  union peridot_swi_flash_reg flash;

  /* Message */
  alt_u32 message;

  /* Interrupt Request */
  alt_u32 swi;
};

#endif  /* __PERIDOT_SWI_REGS_H__ */
/* vim: set et sts=2 sw=2: */
