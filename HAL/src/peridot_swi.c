/*
 * PERIDOT Chrome Apps driver - 'Canarium'
 * Copyright (C) 2016 @kimu_shu and J-7SYSTEM WORKS
 *
 * This source code is distributed under The MIT License (MIT).
 * See LICENSE file in the root directory of this project.
 */

#include <sys/alt_irq.h>
#include <io.h>
#include "peridot_swi.h"
#include "peridot_swi_regs.h"

extern const unsigned int peridot_swi_singleton_base;

static void (*swi_handler)(void *);
static void *swi_handler_arg;

#ifdef ALT_ENHANCED_INTERRUPT_API_PRESENT
static void peridot_swi_irq(void* context);
#else
static void peridot_swi_irq(void* context, alt_u32 id);
#endif

/*
 * Clear interrupt
 */
static ALT_INLINE ALT_ALWAYS_INLINE void peridot_swi_clear_interrupt(unsigned int base)
{
  IOWR_32DIRECT(base, offsetof(struct peridot_swi_regs, swi), 0);
}

/*
 * Initializer
 */
void peridot_swi_init(int irq_controller_id, int irq)
{
  unsigned int base = peridot_swi_singleton_base;

  peridot_swi_clear_interrupt(base);

#ifdef ALT_ENHANCED_INTERRUPT_API_PRESENT
  alt_ic_isr_register(irq_controller_id, irq, peridot_swi_irq, (void *)base, NULL);
#else
  alt_irq_register(irq, (void *)base, peridot_swi_irq);
#endif
}

/*
 * Register IRQ handler
 */
void peridot_swi_irq_handler(void (*handler)(void *), void *arg)
{
  alt_irq_context context = alt_irq_disable_all();
  swi_handler = handler;
  swi_handler_arg = arg;
  alt_irq_enable_all(context);
}

/*
 * Write message data
 */
void peridot_swi_write_message(alt_u32 data)
{
  unsigned int base = peridot_swi_singleton_base;

  IOWR_32DIRECT(base, offsetof(struct peridot_swi_regs, message), data);
}

/*
 * Read message data
 */
alt_u32 peridot_swi_read_message(void)
{
  unsigned int base = peridot_swi_singleton_base;

  return IORD_32DIRECT(base, offsetof(struct peridot_swi_regs, message));
}

/*
 * Interrupt service routine
 */
#ifdef ALT_ENHANCED_INTERRUPT_API_PRESENT
static void peridot_swi_irq(void* context)
#else
static void peridot_swi_irq(void* context, alt_u32 id)
#endif
{
  unsigned int base = (unsigned int)context;

  peridot_swi_clear_interrupt(base);

  /* Invoke handler */
  if (swi_handler)
  {
    (*swi_handler)(swi_handler_arg);
  }
}

/* vim: set et sts=2 sw=2: */
