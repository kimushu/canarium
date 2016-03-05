/*
 * PERIDOT Chrome Apps driver - 'Canarium'
 * Copyright (C) 2016 @kimu_shu
 *
 * This source code is distributed under The MIT License (MIT).
 * See LICENSE file in the root directory of this project.
 */

#include "canarium_uart.h"
#include "canarium_hostcomm.h"
#include "priv/alt_file.h"
#include "system.h"

#if (CANARIUM_UART_OVERRIDE_STDIN != 0) && defined(ALT_STDIN_PRESENT)
#error "canarium_uart.override_stdin cannot be used with hal.stdin"
#endif
#if (CANARIUM_UART_OVERRIDE_STDOUT != 0) && defined(ALT_STDOUT_PRESENT)
#error "canarium_uart.override_stdout cannot be used with hal.stdout"
#endif
#if (CANARIUM_UART_OVERRIDE_STDERR != 0) && defined(ALT_STDERR_PRESENT)
#error "canarium_uart.override_stderr cannot be used with hal.stderr"
#endif

#if ((CANARIUM_UART_OVERRIDE_STDIN != 0) || \
     (CANARIUM_UART_OVERRIDE_STDOUT != 0) || \
     (CANARIUM_UART_OVERRIDE_STDERR != 0))

#if defined(ALT_NO_C_PLUS_PLUS)
#error "canarium_uart.override_std*** must be used with hal.enable_c_plus_plus"
#endif

static __attribute__((constructor)) void canarium_uart_override_stdio(void)
{
  alt_io_redirect(
#if (CANARIUM_UART_OVERRIDE_STDOUT != 0)
    CANARIUM_UART_NAME,
#else
    "/dev/void",
#endif
#if (CANARIUM_UART_OVERRIDE_STDIN != 0)
    CANARIUM_UART_NAME,
#else
    "/dev/void",
#endif
#if (CANARIUM_UART_OVERRIDE_STDERR != 0)
    CANARIUM_UART_NAME
#else
    "/dev/void"
#endif
  );
}
#endif

void canarium_uart_init(canarium_uart_dev *d)
{
  ALT_SEM_CREATE(&(d->svc.sem), 0);
  alt_dev_reg(&(d->dev));
}

int canarium_uart_read_fd(alt_fd *fd, char *ptr, int len)
{
  canarium_uart_dev *dev = (canarium_uart_dev *)fd->dev;
  size_t read_len = 0;
  int result;

  result = canarium_hostcomm_h2c(&dev->svc, ptr, len, &read_len, dev->timeout);
  if (result > 0)
  {
    return -result;
  }

  return (int)read_len;
}

int canarium_uart_write_fd(alt_fd *fd, const char *ptr, int len)
{
  canarium_uart_dev *dev = (canarium_uart_dev *)fd->dev;
  size_t write_len = 0;
  int result;

  result = canarium_hostcomm_c2h(&dev->svc, ptr, len, &write_len, dev->timeout);
  if (result > 0)
  {
    return -result;
  }

  return (int)write_len;
}

int canarium_uart_close_fd(alt_fd *fd)
{
  (void)fd;
  return 0;
}

/* vim: set et sts=2 sw=2: */
