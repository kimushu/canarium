###
エンディアン変換関数
###

if new Uint16Array(new Uint8Array([0,1]).buffer)[0] == 256
  # ホストはリトルエンディアン
  htole16 = (v) -> v
  htobe16 = (v) -> ((v & 0xff00) >>> 8) | ((v & 0xff) << 8)
  htole32 = (v) -> v
  htobe32 = (v) -> ((v & 0xff000000) >>> 24) | ((v & 0xff0000) >>> 8) |
                    ((v & 0xff00) << 8) | ((v & 0xff) << 24)
else
  # ホストはビッグエンディアン
  htobe16 = (v) -> v
  htole16 = (v) -> ((v & 0xff00) >>> 8) | ((v & 0xff) << 8)
  htobe32 = (v) -> v
  htole32 = (v) -> ((v & 0xff000000) >>> 24) | ((v & 0xff0000) >>> 8) |
                    ((v & 0xff00) << 8) | ((v & 0xff) << 24)

# 逆変換は正変換と同一
le16toh = htole16
be16toh = htobe16
le32toh = htole32
be32toh = htobe32

