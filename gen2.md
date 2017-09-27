Canarium Gen2 通信プロトコル
========

Canarium Gen2 プロトコルは、FPGAとPCを1対1で接続し、以下の通信を可能とする。
- [必須] PC→FPGAへのAvalon MMトランザクション発行 (Canarium Gen1と同等の機能)
- [省略可] PC←→FPGA間の双方向バイトストリーム(256本、1バイトは8bit固定)
  - Ch0～Ch7 : Canarium側で用途を固定(予約)、うちCh0は上記のAVMトランザクション実装に利用。
  - Ch8～Ch255 : ユーザー定義

構成
--------

```plantuml
@startuml
left to right direction
[Canarium Gen2] as can2
() COMxx #c0ffc0
() D3XX #ffc0c0
can2 -- COMxx : node-serialport
can2 -- D3XX : node-ftdi

package "FT60x " {
  () FT60x #ffc0c0
  D3XX -- FT60x : USB 3.0 SS
  database FIFO0 as F0 #ffc0c0
  'database FIFO1 as F1 #ffc0c0
  database FIFO2 as F2 #ffc0c0
  database FIFO3 as F3 #ffc0c0
  FT60x -- F0
  'FT60x -- F1
  FT60x -- F2
  FT60x -- F3
}

package "UART " {
  () "UART" as UART #c0ffc0
  COMxx -- UART : USB/RS-232C etc
  database FIFO as F #c0ffc0
  UART -- F
}

[Packets to Bytes (Slow)] as p2bs
[Bytes to Packets (Slow)] as b2ps
[Packets to Bytes (Fast)] as p2bf #ffc0c0
[Bytes to Packets (Fast)] as b2pf #ffc0c0

F0 -- b2ps
F0 -- p2bs
F2 -- b2pf
F3 -- p2bf
F -- b2ps
F -- p2bs

b2pf -- () "aso (ch=N)"
p2bf -- () "asi (ch=N)"
b2ps -- () "aso (ch=N)"
p2bs -- () "asi (ch=N)"

[Packets to Transactions (ch=0)] as p2t
b2ps -- p2t
p2bs -- p2t

p2t -- () avm

@enduml
```

補足説明
* **赤色の要素**はFT60xによる多チャンネルFIFOを通信層に用いる場合のみ有効な要素
* **緑色の要素**はRS232Cなど単一の双方向FIFOを通信層に用いる場合のみ有効な要素
* **黄色の要素**は通信層の実装方法にかかわらず共通の要素
* Avalon-STのMuxは図から割愛している
* aso/asiが不要な場合、右半分は完全にソフトウェアによるエミュレーションで実装することも可能とする。

バイトストリームのプロトコル
--------

Avalon-ST Bytes to Packets / Packets to Bytes のバイトストリームに同じ。<br>
(詳細はインテルの資料 UG-01085 を参照)


旧プロトコルとの組み合わせ
--------

### 1. Gen1同士

従来通り通信可能。Gen2の機能は使えない(当然)。

```plantuml
@startuml
participant "Canarium (Gen1)" as can1
participant "Hostbridge (Gen1)" as hb1
participant "Bytes2Packets" as b2p
participant "Packets2Bytes" as p2b
participant "Packets2Transactions" as p2t
'participant "Avalon-MM Slave" as avs

group コンフィグ層コマンド送受信
  can1 -> hb1 : 0x3A 0xPP
  hb1 -> can1 : 0xQQ
  note right: 応答有り
end group

group データ送信(PC→FPGA)
  can1 -> hb1 : 0xRR
  hb1 -> b2p : 0xRR
  b2p -> p2t : (Packet)
else エスケープ有りの場合
  can1 -> hb1 : 0x3D 0xRR
  hb1 -> b2p : (0xRR^0x20)
  note right: エスケープ解除
  b2p -> p2t : (Packet)
end group

group データ受信(FPGA→PC)
  p2t -> p2b : (Packet)
  p2b -> hb1 : 0xSS
  hb1 -> can1 : 0xSS
  note right: どのデータもエスケープされない
end group

@enduml
```

### 2. Canariumが古い場合

通信不可能。古いCanariumからは新しいHostbridgeを認識できず、接続が成立しない。

```plantuml
@startuml
participant "Canarium (Gen1)" as can1
participant "Bytes2Packets" as b2p
participant "Packets2Bytes" as p2b

group コンフィグ層コマンド送受信
  can1 -> b2p : 0x3A 0xPP ※1
  p2b -->x can1
  note right: 0x3Aに応答しない ※2
  can1 -> can1 : タイムアウトにより\nエラー扱い
end group

@enduml
```

※1) 接続試行の段階ではnCONFIG=Hとするため、0xPPのbit0は常に1。<br>
よって0xPPが0x7Aや0x7Cとなることはあり得ない。よって、チャネル選択もSOPも生成され得ない。

※2) これを満たすためには、FPGA側は電源投入後～Canariumとの接続成立までの間に、<br>自発的にデータを送出してはならない。

### 3. Hostbridgeが古い場合

通信不可能。新しいCanariumからは古いHostbridgeを認識できず、接続が成立しない。

```plantuml
@startuml
participant "Canarium (Gen2)" as can2
participant "Hostbridge (Gen1)" as hb1
participant "Bytes2Packets" as b2p
participant "Packets2Bytes" as p2b
participant "Packets2Transactions" as p2t

group ダミーTransaction送受信
  can2 -> hb1 : 0x7C 0x00 0x7A 0x7F\n0x00 0x00 0x00 0x00\n0x00 <b>0x3D 0x7B</b> 0x00
  hb1 -> b2p : 0x7C 0x00 0x7A 0x7F\n0x00 0x00 0x00 0x00\n0x00 0x00 <b>0x5B</b> 0x00
  note right: 0x3D 0x7B が 0x5B に変化\n(エスケープ解除)
  b2p -> p2t : (CH=0) (SOP) 0x7F 0x00 0x00 0x00\n0x00 0x00 0x00 0x5B 0x00
  note right: EOPはまだ含まれない
  p2t -->x p2b :
  note right: パケット未達のため\n何もしない
  can2 -> can2 : Transactionの応答待ちが\nタイムアウトし、エラー扱い
end group

group ダミーTransaction送受信(再試行した場合)
  can2 -> hb1 : 0x7C 0x00 0x7A 0x7F\n0x00 0x00 0x00 0x00\n0x00 <b>0x3D 0x7B</b> 0x00
  hb1 -> b2p : 0x7C 0x00 0x7A 0x7F\n0x00 0x00 0x00 0x00\n0x00 0x00 <b>0x5B</b> 0x00
  note right: 0x3D 0x7B が 0x5B に変化\n(エスケープ解除)
  b2p -> p2t : (CH=0) (SOP) 0x7F 0x00 0x00 0x00\n0x00 0x00 0x00 0x5B 0x00
  note right: SOP検出＝前回の未完了パケットは破棄\nEOPはまだ含まれない
  p2t -->x p2b :
  note right: パケット未達のため\n何もしない
  can2 -> can2 : Transactionの応答待ちが\nタイムアウトし、エラー扱い
end group

@enduml
```

### 4. Gen2同士

通信可能。Gen2の機能を利用できる。

```plantuml
@startuml
participant "Canarium (Gen2)" as can2
participant "Bytes2Packets" as b2p
participant "Packets2Bytes" as p2b
participant "Packets2Transactions" as p2t
participant "Avalon-MM Slaves" as avs

group ダミーTransaction送受信
  can2 -> b2p : 0x7C 0x00 0x7A 0x7F\n0x00 0x00 0x00 0x00\n0x00 0x3D 0x7B 0x00
  note right: 0x3Dのエスケープ解除は無い
  b2p -> p2t : (CH=0) (SOP) 0x7F 0x00 0x00 0x00\n0x00 0x00 0x3D 0x00 (EOP)
  note right: Transaction 要求\n(code=0x7F,size=0x0,addr=0x3D00)
  p2t ->x avs : (何もしない)
  note right: code=0x7Fは"No transaction"のため。
  p2t -> p2b : (CH=0) (SOP)\n0xFF 0x00 0x00 0x00 (EOP)
  note right: Transaction 応答\n(code=0x7F^0x80,size=0x0)
  p2b -> can2 : 0x7C 0x00 0x7A 0xFF 0x00 0x00 0x7B 0x00
  can2 -> can2 : Transaction応答を確認し\n接続確立
end group
@enduml
```
