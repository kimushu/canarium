/*
 * PERIDOT Chrome Apps driver - 'Canarium'
 * Copyright (C) 2016 @kimu_shu
 *
 * This source code is distributed under The MIT License (MIT).
 * See LICENSE file in the root directory of this project.
 */

#include "canarium_serial.h"
#include "canarium_hostcomm.h"
#include "os/alt_sem.h"
#include "priv/alt_file.h"
#include "system.h"
#include <fcntl.h>
#include <errno.h>

#if (CANARIUM_SERIAL_OVERRIDE_STDIN != 0) && defined(ALT_STDIN_PRESENT)
#error "canarium_serial.override_stdin cannot be used with hal.stdin"
#endif
#if (CANARIUM_SERIAL_OVERRIDE_STDOUT != 0) && defined(ALT_STDOUT_PRESENT)
#error "canarium_serial.override_stdout cannot be used with hal.stdout"
#endif
#if (CANARIUM_SERIAL_OVERRIDE_STDERR != 0) && defined(ALT_STDERR_PRESENT)
#error "canarium_serial.override_stderr cannot be used with hal.stderr"
#endif

#if ((CANARIUM_SERIAL_OVERRIDE_STDIN != 0) || \
     (CANARIUM_SERIAL_OVERRIDE_STDOUT != 0) || \
     (CANARIUM_SERIAL_OVERRIDE_STDERR != 0))

#if defined(ALT_NO_C_PLUS_PLUS)
#error "canarium_serial.override_std*** must be used with hal.enable_c_plus_plus"
#endif

static __attribute__((constructor)) void canarium_serial_override_stdio(void)
{
  alt_io_redirect(
#if (CANARIUM_SERIAL_OVERRIDE_STDOUT != 0)
    CANARIUM_SERIAL_NAME,
#else
    "/dev/void",
#endif
#if (CANARIUM_SERIAL_OVERRIDE_STDIN != 0)
    CANARIUM_SERIAL_NAME,
#else
    "/dev/void",
#endif
#if (CANARIUM_SERIAL_OVERRIDE_STDERR != 0)
    CANARIUM_SERIAL_NAME
#else
    "/dev/void"
#endif
  );
}
#endif

void canarium_serial_init(canarium_serial_dev *d)
{
  ALT_SEM_CREATE(&(d->svc.sem), 0);
  alt_dev_reg(&(d->dev));
}

int canarium_serial_read_fd(alt_fd *fd, char *ptr, int len)
{
  canarium_serial_dev *dev = (canarium_serial_dev *)fd->dev;
  size_t read_len;
  int result;

  do
  {
    result = canarium_hostcomm_h2c(&dev->svc, ptr, len, &read_len, dev->timeout);
    if (result == 0)
    {
      return (int)read_len;
    }
    if (result != EWOULDBLOCK)
    {
      return -result;
    }
  }
  while (!(fd->fd_flags & O_NONBLOCK));

  return -EWOULDBLOCK;
}

int canarium_serial_write_fd(alt_fd *fd, const char *ptr, int len)
{
  canarium_serial_dev *dev = (canarium_serial_dev *)fd->dev;
  size_t write_len = 0;
  int result;

  result = canarium_hostcomm_c2h(&dev->svc, ptr, len, &write_len, dev->timeout);
  if (result > 0)
  {
    return -result;
  }

  return (int)write_len;
}

int canarium_serial_close_fd(alt_fd *fd)
{
  (void)fd;
  return 0;
}

/* vim: set et sts=2 sw=2: */
