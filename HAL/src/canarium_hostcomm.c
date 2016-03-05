/*
 * PERIDOT Chrome Apps driver - 'Canarium'
 * Copyright (C) 2016 @kimu_shu and J-7SYSTEM WORKS
 *
 * This source code is distributed under The MIT License (MIT).
 * See LICENSE file in the root directory of this project.
 */

#include <string.h>
#include <errno.h>
#include "canarium_hostcomm.h"
#include "sys/alt_alarm.h"
#include "sys/alt_cache.h"
#include "sys/alt_irq.h"
#include "io.h"
#include "system.h"

#if defined(__PERIDOT_SWI)
#include "peridot_swi.h"
#else
#error "No SWI interface for Canarium found"
#endif

static canarium_hostcomm_desc *last;

static void canarium_hostcomm_receive(void *arg);
static void canarium_hostcomm_callback(canarium_hostcomm_desc *desc);

typedef struct
{
  canarium_hostcomm_desc desc;
  volatile int done;
  canarium_hostcomm_svc *service;
  char data[];
}
canarium_hostcomm_pack;

/*
 * Initialize hostcomm
 */
void canarium_hostcomm_init(void)
{
  last = NULL;
  canarium_write_message(NULL);
  canarium_register_irq_handler(canarium_hostcomm_receive, NULL);
}

/*
 * Client to Host transfer (HostRead)
 */
int canarium_hostcomm_c2h(canarium_hostcomm_svc *service, const void *data, size_t length,
    size_t *written, int timeout)
{
  canarium_hostcomm_pack *pack;
  int result;

  pack = (canarium_hostcomm_pack *)malloc(sizeof(*pack) + length);
  if (pack == NULL)
  {
    return ENOMEM;
  }

  pack->desc.cmd_reqbytes =
    (CANARIUM_HOSTCOMM_CMD_HOSTREAD << CANARIUM_HOSTCOMM_COMMAND_OFST) |
    (length << CANARIUM_HOSTCOMM_REQBYTES_OFST);
  pack->desc.port_number = service->port_number;
  pack->desc.data_address = &pack->data;
  pack->desc.callback = canarium_hostcomm_callback;
  pack->done = 0;
  pack->service = service;
  if (length > 0)
  {
    memcpy(&pack->data, data, length);
    alt_dcache_flush(&pack->data, length);
  }

  canarium_hostcomm_queue(&pack->desc, timeout);

  do
  {
    ALT_SEM_PEND(service->sem, 0);
  }
  while (!pack->done);

  switch ((pack->desc.resp_status & CANARIUM_HOSTCOMM_COMMAND_MSK)
          >> CANARIUM_HOSTCOMM_COMMAND_OFST)
  {
  case CANARIUM_HOSTCOMM_RESP_HOSTREAD:
    if (written)
    {
      *written = (pack->desc.resp_status & CANARIUM_HOSTCOMM_STATUS_MSK)
                  >> CANARIUM_HOSTCOMM_STATUS_OFST;
    }
    result = 0;
    break;
  case CANARIUM_HOSTCOMM_RESP_PENDING:
    result = ETIMEDOUT;
    break;
  case CANARIUM_HOSTCOMM_RESP_HOSTWRITE:
    result = EIO;
    break;
  default:  // ERROR
    result = (pack->desc.resp_status & CANARIUM_HOSTCOMM_STATUS_MSK)
              >> CANARIUM_HOSTCOMM_STATUS_OFST;
    break;
  }

  free(pack);
  return result;
}

/*
 * Host to Client transfer (HostWrite)
 */
int canarium_hostcomm_h2c(canarium_hostcomm_svc *service, void *data, size_t length,
    size_t *read, int timeout)
{
  canarium_hostcomm_pack *pack;
  size_t transfered;
  int result;

  pack = (canarium_hostcomm_pack *)malloc(sizeof(*pack) + length);
  if (pack == NULL)
  {
    return ENOMEM;
  }

  pack->desc.cmd_reqbytes =
    (CANARIUM_HOSTCOMM_CMD_HOSTWRITE << CANARIUM_HOSTCOMM_COMMAND_OFST) |
    (length << CANARIUM_HOSTCOMM_REQBYTES_OFST);
  pack->desc.port_number = service->port_number;
  pack->desc.data_address = &pack->data;
  pack->desc.callback = canarium_hostcomm_callback;
  pack->done = 0;
  pack->service = service;

  canarium_hostcomm_queue(&pack->desc, timeout);

  do
  {
    ALT_SEM_PEND(service->sem, 0);
  }
  while (!pack->done);

  switch ((pack->desc.resp_status & CANARIUM_HOSTCOMM_COMMAND_MSK)
          >> CANARIUM_HOSTCOMM_COMMAND_OFST)
  {
  case CANARIUM_HOSTCOMM_RESP_HOSTWRITE:
    transfered = (pack->desc.resp_status & CANARIUM_HOSTCOMM_STATUS_MSK)
                  >> CANARIUM_HOSTCOMM_STATUS_OFST;
    if (transfered > length)
    {
      transfered = length;
    }
    memcpy(data, pack->data, transfered);
    if (read)
    {
      *read = transfered;
    }
    result = 0;
    break;
  case CANARIUM_HOSTCOMM_RESP_PENDING:
    result = ETIMEDOUT;
    break;
  case CANARIUM_HOSTCOMM_RESP_HOSTREAD:
    result = EIO;
    break;
  default:  // ERROR
    result = (pack->desc.resp_status & CANARIUM_HOSTCOMM_STATUS_MSK)
              >> CANARIUM_HOSTCOMM_STATUS_OFST;
    break;
  }

  free(pack);
  return result;
}

/*
 * Queue descriptor
 */
void canarium_hostcomm_queue(canarium_hostcomm_desc *desc, int timeout)
{
  int context;

  desc->next = NULL;
  desc->reserved_zero = 0;
  desc->resp_status = 0;
  desc->timestamp = alt_nticks() + timeout;
  alt_dcache_flush(desc, sizeof(*desc));

  context = alt_irq_disable_all();

  if (last)
  {
    last->next = desc;
    alt_dcache_flush(&last->next, sizeof(last->next));
  }
  else
  {
    canarium_write_message(desc);
  }
  last = desc;

  alt_irq_enable_all(context);
}

/*
 * Receive finished descriptors
 */
static void canarium_hostcomm_receive(void *arg)
{
  canarium_hostcomm_desc *prev, *desc;
  alt_u32 word;
  (void)arg;

  prev = NULL;
  desc = (canarium_hostcomm_desc *)canarium_read_message();

  for (; desc; desc = desc->next)
  {
    /* check response */
    word = IORD_32DIRECT(desc, offsetof(canarium_hostcomm_desc, resp_status));
    if (((word & CANARIUM_HOSTCOMM_RESPONSE_MSK) >> CANARIUM_HOSTCOMM_RESPONSE_OFST)
        == CANARIUM_HOSTCOMM_RESP_PENDING)
    {
      // TODO: timeout detection
      prev = desc;
      continue;
    }

#if (NIOS2_DCACHE_SIZE > 0)
    alt_dcache_flush_no_writeback(&desc->resp_status, sizeof(desc->resp_status));
#endif

    /* remove from linked list */
    if (prev)
    {
      prev->next = desc->next;
      alt_dcache_flush(&desc->next, sizeof(desc->next));
    }
    else
    {
      canarium_write_message(desc->next);
    }

    /* invoke callback */
    if (desc->callback)
    {
      (*desc->callback)(desc);
    }
  }

  last = prev;
}

/*
 * Callback for service descriptor
 */
static void canarium_hostcomm_callback(canarium_hostcomm_desc *desc)
{
  canarium_hostcomm_pack *pack = (canarium_hostcomm_pack *)desc;
  pack->done = 1;
  ALT_SEM_POST(pack->service->sem);
}

/* vim: set et sts=2 sw=2: */
