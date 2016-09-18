/*
 * PERIDOT Chrome Apps driver - 'Canarium'
 * Copyright (C) 2016 @kimu_shu and J-7SYSTEM WORKS
 *
 * This source code is distributed under The MIT License (MIT).
 * See LICENSE file in the root directory of this project.
 */

#ifndef __CANARIUM_HOSTCOMM_H__
#define __CANARIUM_HOSTCOMM_H__

#include "alt_types.h"
#include "os/alt_sem.h"

#ifdef __cplusplus
extern "C" {
#endif  /* __cplusplus */

#define CANARIUM_HOSTCOMM_DESC_ENABLE   (1u)

#define CANARIUM_HOSTCOMM_COMMAND_MSK   (0xC0000000u)
#define CANARIUM_HOSTCOMM_COMMAND_OFST  (30)
#define CANARIUM_HOSTCOMM_REQBYTES_MSK  (0x3FFFFFFFu)
#define CANARIUM_HOSTCOMM_REQBYTES_OFST (0)
#define CANARIUM_HOSTCOMM_RESPONSE_MSK  (0xC0000000u)
#define CANARIUM_HOSTCOMM_RESPONSE_OFST (30)
#define CANARIUM_HOSTCOMM_STATUS_MSK    (0x3FFFFFFFu)
#define CANARIUM_HOSTCOMM_STATUS_OFST   (0)

enum
{
  CANARIUM_HOSTCOMM_CMD_HOSTWRITE  = 0,
  CANARIUM_HOSTCOMM_CMD_HOSTREAD   = 1,
};

enum
{
  CANARIUM_HOSTCOMM_RESP_PENDING   = 0,
  CANARIUM_HOSTCOMM_RESP_ERROR     = 1,
  CANARIUM_HOSTCOMM_RESP_HOSTWRITE = 2,
  CANARIUM_HOSTCOMM_RESP_HOSTREAD  = 3,
};

typedef struct
{
  alt_u16 port_number;
  ALT_SEM(sem);
}
canarium_hostcomm_svc;

typedef struct canarium_hostcomm_desc
{
  struct canarium_hostcomm_desc *next;
  alt_u32 cmd_reqbytes;
  alt_u16 port_number;
  alt_u16 reserved_zero;
  void *data_address;
  void (*callback)(struct canarium_hostcomm_desc *);
  alt_u32 resp_status;
  alt_u32 timestamp;  // TODO:modified from original specification
}
canarium_hostcomm_desc;

extern void canarium_hostcomm_init(void);
extern void canarium_hostcomm_queue(canarium_hostcomm_desc *desc, int timeout);
extern int canarium_hostcomm_c2h(canarium_hostcomm_svc *service,
    const void *data, size_t length, size_t *written, int timeout);
extern int canarium_hostcomm_h2c(canarium_hostcomm_svc *service,
    void *data, size_t length, size_t *read, int timeout);

#define CANARIUM_HOSTCOMM_INSTANCE(name, d) \
  extern int alt_no_storage

#define CANARIUM_HOSTCOMM_INIT(name, d) \
  canarium_hostcomm_init()

#ifdef __cplusplus
} /* extern "C" */
#endif  /* __cplusplus */

#endif  /* __CANARIUM_HOSTCOMM_H__ */
/* vim: set et sts=2 sw=2: */
