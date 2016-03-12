/*
 * PERIDOT Chrome Apps driver - 'Canarium'
 * Copyright (C) 2016 @kimu_shu
 *
 * This source code is distributed under The MIT License (MIT).
 * See LICENSE file in the root directory of this project.
 */

#ifndef __CANARIUM_SERIAL_H__
#define __CANARIUM_SERIAL_H__

#include <stddef.h>
#include "canarium_hostcomm.h"
#include "sys/alt_dev.h"
#include "sys/alt_llist.h"

#ifdef __cplusplus
extern "C" {
#endif  /* __cplusplus */

typedef struct canarium_serial_dev_s
{
  alt_dev dev;
  canarium_hostcomm_svc svc;
  int timeout;
}
canarium_serial_dev;

extern void canarium_serial_init(canarium_serial_dev *d);
extern int canarium_serial_read_fd(alt_fd *fd, char *ptr, int len);
extern int canarium_serial_write_fd(alt_fd *fd, const char *ptr, int len);
extern int canarium_serial_close_fd(alt_fd *fd);

#define CANARIUM_SERIAL_INSTANCE(name, d) \
  static canarium_serial_dev d =          \
  {                                     \
    {                                   \
      ALT_LLIST_ENTRY,                  \
      name##_NAME,                      \
      NULL, /* open */                  \
      canarium_serial_close_fd,           \
      canarium_serial_read_fd,            \
      canarium_serial_write_fd,           \
      NULL, /* lseek */                 \
      NULL, /* fstat */                 \
      NULL, /* ioctl */                 \
    },                                  \
    {                                   \
      name##_PORT_NUMBER,               \
    },                                  \
    name##_TIMEOUT,                     \
  }

#define CANARIUM_SERIAL_INIT(name, d)     \
  canarium_serial_init(&d)

#ifdef __cplusplus
} /* extern "C" */
#endif  /* __cplusplus */

#endif  /* __CANARIUM_SERIAL_H__ */
/* vim: set et sts=2 sw=2: */
