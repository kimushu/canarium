/*
 * PERIDOT test suite for Canarium with SWI peripheral
 *
 * This design is based on 'Olive' design by J-7SYSTEM Works.
 */

// *******************************************************************
//   Copyright (C) 2015, J-7SYSTEM Works.  All rights Reserved.
//
// * This module is a free sourcecode and there is NO WARRANTY.
// * No restriction on use. You can use, modify and redistribute it
//   for personal, non-profit or commercial products UNDER YOUR
//   RESPONSIBILITY.
// * Redistributions of source code must retain the above copyright
//   notice.
// *******************************************************************


module swi_testsuite_top(
	// clk and system reset
	input			CLOCK_50,
	input			RESET_N,

	// Interface: SCI Host communication
	input			SCI_SCLK,
	input			SCI_TXD,
	output			SCI_RXD,
	output			SCI_TXR_N,
	input			SCI_RXR_N,

	// Interface: SPI-Flash memory controller
	output			EPCS_CSO_N,
	output			DCLK_OUT,
	output			EPCS_ASDO,
	input			EPCS_DATA0,

	// Interface: SDRAM
	output			SDR_CLK,
	output			SDR_CKE,
	output			SDR_CS_N,
	output			SDR_RAS_N,
	output			SDR_CAS_N,
	output			SDR_WE_N,
	output [1:0]	SDR_BA,
	output [11:0]	SDR_A,
	inout  [15:0]	SDR_DQ,
	output [1:0]	SDR_DQM,

	// GPIO
	inout  [27:0]	D,

	// OnBoard LED
	output			START_LED
);


/* ===== 外部変更可能パラメータ ========== */



/* ----- 内部パラメータ ------------------ */


/* ※以降のパラメータ宣言は禁止※ */

/* ===== ノード宣言 ====================== */
				/* 内部は全て正論理リセットとする。ここで定義していないノードの使用は禁止 */
	wire			reset_sig = ~RESET_N;			// モジュール内部駆動非同期リセット 

				/* 内部は全て正エッジ駆動とする。ここで定義していないクロックノードの使用は禁止 */
	wire			clock_sig = CLOCK_50;			// モジュール内部駆動クロック 

	wire			qsys_reset_n_sig;
	wire			clock_core_sig;
	wire			clock_peri_sig;
	wire			cpureset_sig;
	reg  [1:0]		resetreq_reg;


/* ※以降のwire、reg宣言は禁止※ */

/* ===== テスト記述 ============== */



/* ===== モジュール構造記述 ============== */

	///// PLLとQsysコアのインスタンス /////

	syspll
	u0 (
		.areset		(reset_sig),
		.inclk0		(clock_sig),
		.c0			(SDR_CLK),
		.c1			(clock_core_sig),
		.c2			(clock_peri_sig),
		.locked		(qsys_reset_n_sig)
	);

	swi_testsuite_core
	u1 (
        .reset_reset_n   (qsys_reset_n_sig),		//    reset.reset_n
        .clk_100m_clk    (clock_core_sig),			// clk_100m.clk
        .clk_25m_clk     (clock_peri_sig),			//  clk_25m.clk

        .nios2_cpu_resetrequest (resetreq_reg[1]),	//    nios2.cpu_resetrequest <-- NiosIIのバストランザクションを完了させるリセット要求 
        .nios2_cpu_resettaken   (),					//         .cpu_resettaken

        .sci_sclk        (SCI_SCLK),				//      sci.sclk
        .sci_txd         (SCI_TXD),					//         .txd
        .sci_txr_n       (SCI_TXR_N),				//         .txr_n
        .sci_rxd         (SCI_RXD),					//         .rxd
        .sci_rxr_n       (SCI_RXR_N),				//         .rxr_n

        .sdr_addr        (SDR_A),					//      sdr.addr
        .sdr_ba          (SDR_BA),					//         .ba
        .sdr_cs_n        (SDR_CS_N),				//         .cs_n
        .sdr_ras_n       (SDR_RAS_N),				//         .ras_n
        .sdr_cas_n       (SDR_CAS_N),				//         .cas_n
        .sdr_we_n        (SDR_WE_N),				//         .we_n
        .sdr_dq          (SDR_DQ),					//         .dq
        .sdr_dqm         (SDR_DQM),					//         .dqm
        .sdr_cke         (SDR_CKE),					//         .cke

        .swi_cpureset    (cpureset_sig),			//      swi.cpureset
        .swi_led         (START_LED),				//         .led
        .swi_cso_n       (EPCS_CSO_N),				//         .cso_n
        .swi_dclk        (DCLK_OUT),				//         .dclk
        .swi_asdo        (EPCS_ASDO),				//         .asdo
        .swi_data0       (EPCS_DATA0)				//         .data0
    );


	// cpu_resetrequest信号の同期化 

	always @(posedge clock_core_sig or negedge qsys_reset_n_sig) begin
		if (!qsys_reset_n_sig) begin
			resetreq_reg <= 2'b00;
		end
		else begin
			resetreq_reg <= {resetreq_reg[0], cpureset_sig};
		end
	end

endmodule

