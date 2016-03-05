/*
 * PERIDOT Chrome Apps driver - 'Canarium'
 * Copyright (C) 2016 @kimu_shu
 *
 * This source code is distributed under The MIT License (MIT).
 * See LICENSE file in the root directory of this project.
 */

#ifndef __CANARIUM_UART_H__
#define __CANARIUM_UART_H__

#include <stddef.h>
#include "canarium_hostcomm.h"
#include "sys/alt_dev.h"
#include "sys/alt_llist.h"
#include "os/alt_sem.h"

#ifdef __cplusplus
extern "C" {
#endif  /* __cplusplus */

typedef struct canarium_uart_dev_s
{
  alt_dev dev;
  canarium_hostcomm_svc svc;
  int timeout;
}
canarium_uart_dev;

extern void canarium_uart_init(canarium_uart_dev *d);
extern int canarium_uart_read_fd(alt_fd *fd, char *ptr, int len);
extern int canarium_uart_write_fd(alt_fd *fd, const char *ptr, int len);
extern int canarium_uart_close_fd(alt_fd *fd);

#define CANARIUM_UART_INSTANCE(name, d) \
  static canarium_uart_dev d =          \
  {                                     \
    {                                   \
      ALT_LLIST_ENTRY,                  \
      name##_NAME,                      \
      NULL, /* open */                  \
      canarium_uart_close_fd,           \
      canarium_uart_read_fd,            \
      canarium_uart_write_fd,           \
      NULL, /* lseek */                 \
      NULL, /* fstat */                 \
      NULL, /* ioctl */                 \
    },                                  \
    {                                   \
      name##_PORT_NUMBER,               \
    },                                  \
    name##_TIMEOUT,                     \
  }

#define CANARIUM_UART_INIT(name, d)     \
  canarium_uart_init(&d)

#ifdef __cplusplus
} /* extern "C" */
#endif  /* __cplusplus */

#endif  /* __CANARIUM_UART_H__ */
/* vim: set et sts=2 sw=2: */
