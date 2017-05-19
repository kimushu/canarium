#include <stddef.h>
#include <fcntl.h>
#include "sys/alt_dev.h"
#include "sys/alt_llist.h"
#include "peridot_client_fs.h"
#include "peridot_rpc_server.h"

#if 0
/*
 * Pseudo files for testing
 *
 * /foo/bar1 (dev) 64k buffer output port (read-only)
 * /foo/bar2 (dev) 64k buffer input port (write-only)
 * /foo/bar3 (dev) 64k buffer in/out port (read&write)
 * /mnt/baz/ (fs)
 * /mnt/baz/
 */

#define DUMMY_SIZE (65536 * 2)

static void *dummy_buf;

static void init_dummy(void)
{
	unsigned short *word;
	unsigned short n;

	dummy_buf = malloc(DUMMY_SIZE);

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
}

static int dev_read(alt_fd *fd, char *ptr, int len)
{
	int cur = (int)fd->priv;
	int max = DUMMY_SIZE - cur;

	if (len > max) {
		len = max;
	}



	fd->priv = (void *)(cur + len);
}

static int dev_write(alt_fd *fd, const char *ptr, int len)
{
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
	NULL, /* lseek */
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
#endif

int main(void)
{
	//init_dummy();
	//alt_dev_reg(&dev_foo_bar1);
	//alt_dev_reg(&dev_foo_bar2);
	//alt_dev_reg(&dev_foo_bar3);
	//alt_fs_reg(&fs_mnt_baz);
	//peridot_client_fs_add_file("/foo/bar1", O_RDONLY);
	//peridot_client_fs_add_file("/foo/bar2", O_WRONLY);
	//peridot_client_fs_add_file("/foo/bar3", O_RDWR);
	//peridot_client_fs_add_directory("/foo/bar", O_RDWR);

	mkfifo("/foo/fifo", 0);
	peridot_client_fs_add_file("/foo/fifo", O_RDWR);

	for (;;) {
		peridot_rpc_server_process();
	}
}

