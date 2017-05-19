#include <stddef.h>
#include <errno.h>
#include <malloc.h>
#include <string.h>
#include "sys/alt_alarm.h"
#include "peridot_rpc_server.h"
#include "bson.h"

void *test_echo(const void *doc, int max_result_len)
{
	int len = bson_measure_document(doc);
	if (len <= max_result_len) {
		void *buf = malloc(len);
		if (buf) {
			memcpy(buf, doc, len);
			errno = 0;
			return buf;
		}
	} else {
		errno = EMSGSIZE;
	}
	return NULL;
}

void *test_wait(const void *doc, int max_result_len)
{
	alt_u32 start = alt_nticks();
	alt_u32 end = start + alt_ticks_per_second();
	for (;;) {
		alt_u32 now = alt_nticks();
		if ((start < end && (end <= now || now < start)) ||
			(end < start && (end <= now && now < start))) {
			break;
		}
	}
	return NULL;
}

int main(void)
{
	peridot_rpc_server_register_method("echo", test_echo);
	peridot_rpc_server_register_method("wait", test_wait);

	for (;;) {
		peridot_rpc_server_process();
	}
}

