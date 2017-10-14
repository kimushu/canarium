#include <stddef.h>
#include <fcntl.h>
#include <string.h>
#include <stdlib.h>
#include <unistd.h>
#include <errno.h>
#include "sys/alt_dev.h"
#include "sys/alt_llist.h"
#include "peridot_client_fs.h"
#include "peridot_rpc_server.h"

/*
 * Pseudo files for testing
 *
 * /foo/bar1 (dev) 128k shared buffer output port (read-only)
 * /foo/bar2 (dev) 128k shared buffer input port (write-only)
 * /foo/bar3 (dev) 128k shared buffer in/out port (read&write)
 * /mnt/baz/ (fs)
 * /mnt/baz/
 */

#define DUMMY_SIZE (128*1024)

static char *dummy_buf;

static void init_dummy(void)
{
	unsigned short *word;
	unsigned short n;

	dummy_buf = (char *)malloc(DUMMY_SIZE);

	word = (unsigned short *)dummy_buf;
	for (n = 0;;) {
		*word++ = n++;
		if (n == 0) {
			break;
		}
	}
}

static int dev_open(alt_fd *fd, const char *name, int flags, int mode)
{
	fd->priv = (void *)0;
	return 0;
}

static int dev_close(alt_fd *fd)
{
	return 0;
}

static int dev_read(alt_fd *fd, char *ptr, int len)
{
	int cur = (int)fd->priv;
	int max = DUMMY_SIZE - cur;
	if (!(((fd->fd_flags & O_ACCMODE) + 1) & _FREAD)) {
		return -EACCES;
	}
	if (len > max) {
		len = max;
	}
	memcpy(ptr, dummy_buf + cur, len);
	fd->priv = (void *)(cur + len);
	return len;
}

static int dev_write(alt_fd *fd, const char *ptr, int len)
{
	int cur = (int)fd->priv;
	int max = DUMMY_SIZE - cur;
	if (!(((fd->fd_flags & O_ACCMODE) + 1) & _FWRITE)) {
		return -EACCES;
	}
	if (len > max) {
		len = max;
	}
	memcpy(dummy_buf + cur, ptr, len);
	fd->priv = (void *)(cur + len);
	return len;
}

static int dev_lseek(alt_fd *fd, int ptr, int dir)
{
	int cur = (int)fd->priv;
	switch (dir) {
		case SEEK_CUR:
			cur += ptr;
			break;
		case SEEK_SET:
			cur = ptr;
			break;
		case SEEK_END:
			cur = DUMMY_SIZE + ptr;
			break;
	}
	if (cur < 0) {
		cur = 0;
	} else if (cur > DUMMY_SIZE) {
		cur = DUMMY_SIZE;
	}
	return cur;
}

static int fs_open(alt_fd *fd, const char *name, int flags, int mode)
{
}

static int fs_close(alt_fd *fd)
{
}

static int fs_read(alt_fd *fd, char *ptr, int len)
{
}

static int fs_write(alt_fd *fd, const char *ptr, int len)
{
}

static alt_dev dev_foo_bar1 = {
	ALT_LLIST_ENTRY,
	"/foo/bar1",
	dev_open,
	dev_close,
	dev_read,
	dev_write,
	dev_lseek,
	NULL, /* fstat */
	NULL, /* ioctl */
};

static alt_dev dev_foo_bar2 = {
	ALT_LLIST_ENTRY,
	"/foo/bar2",
	dev_open,
	dev_close,
	dev_read,
	dev_write,
	NULL, /* lseek */
	NULL, /* fstat */
	NULL, /* ioctl */
};

static alt_dev dev_foo_bar3 = {
	ALT_LLIST_ENTRY,
	"/foo/bar3",
	dev_open,
	dev_close,
	dev_read,
	dev_write,
	NULL, /* lseek */
	NULL, /* fstat */
	NULL, /* ioctl */
};

static alt_dev fs_mnt_baz = {
	ALT_LLIST_ENTRY,
	"/mnt/baz",
	fs_open,
	fs_close,
	fs_read,
	fs_write,
	NULL, /* lseek */
	NULL, /* fstat */
	NULL, /* ioctl */
};

int main(void)
{
	init_dummy();
	alt_dev_reg(&dev_foo_bar1);
	alt_dev_reg(&dev_foo_bar2);
	alt_dev_reg(&dev_foo_bar3);
	//alt_fs_reg(&fs_mnt_baz);
	peridot_client_fs_add_file("/foo/bar1", O_RDONLY);
	peridot_client_fs_add_file("/foo/bar2", O_WRONLY);
	peridot_client_fs_add_file("/foo/bar3", O_RDWR);
	//peridot_client_fs_add_directory("/foo/bar", O_RDWR);

	mkfifo("/foo/fifo", 0);
	peridot_client_fs_add_file("/foo/fifo", O_RDWR);

	for (;;) {
		peridot_rpc_server_process();
	}
}

