/*
 * PERIDOT Chrome Apps driver - 'Canarium'
 * Copyright (C) 2016 @kimu_shu and J-7SYSTEM WORKS
 *
 * This source code is distributed under The MIT License (MIT).
 * See LICENSE file in the root directory of this project.
 */

#ifndef __PERIDOT_SWI_H__
#define __PERIDOT_SWI_H__

#include "alt_types.h"

#ifdef __cplusplus
extern "C" {
#endif  /* __cplusplus */

extern void peridot_swi_init(int irq_controller_id, int irq);
extern void peridot_swi_irq_handler(void (*handler)(void *), void *arg);
extern void peridot_swi_write_message(alt_u32 data);
extern alt_u32 peridot_swi_read_message(void);

#define PERIDOT_SWI_INSTANCE(name, dev) \
  const unsigned int peridot_swi_singleton_base = (name##_BASE)

#define PERIDOT_SWI_INIT(name, dev) \
  peridot_swi_init(name##_IRQ_INTERRUPT_CONTROLLER_ID, name##_IRQ)

/*
 * Abstraction methods for Canarium
 */
static ALT_INLINE ALT_ALWAYS_INLINE
void canarium_write_message(void *data)
{
  peridot_swi_write_message((alt_u32)data);
}

static ALT_INLINE ALT_ALWAYS_INLINE
void *canarium_read_message(void)
{
  return (void *)peridot_swi_read_message();
}

static ALT_INLINE ALT_ALWAYS_INLINE
void canarium_register_irq_handler(void (*handler)(void *), void *arg)
{
  peridot_swi_irq_handler(handler, arg);
}

#ifdef __cplusplus
} /* extern "C" */
#endif  /* __cplusplus */

#endif  /* __PERIDOT_SWI_H__ */
/* vim: set et sts=2 sw=2: */
