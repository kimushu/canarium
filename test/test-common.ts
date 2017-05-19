import * as path from 'path';
import * as fs from 'fs-extra';
import * as chai from 'chai';
import { exec, ExecOptionsWithStringEncoding } from 'child_process';
chai.use(require('chai-as-promised'));
const {assert} = chai;
import { Canarium } from '../src/canarium';

export const TEST_DIR = path.join(__dirname, '..', '..', 'test');
export const CLASSIC_RBF_PATH = path.join(TEST_DIR, 'peridot_classic', 'output_files', 'swi_testsuite.rbf');
export let CLASSIC_RBF_DATA;
export const CLASSIC_CLASSID = 0x72a09001;
export const SWI_BASE = 0x10000000;
export const REG_SWI_CLASSID = 0;
export const REG_SWI_MESSAGE = 6;
export const SDRAM_BASE = 0x00000000;
export const SDRAM_SPAN = 8*1024*1024;

export const cond = {
    classic_ps: <string>null,
    classic_as: <string>null,
    classic:    <string[]>[],
    boards:     <string[]>[],
};

(()=>{
    Canarium.enumerate()
    .then((list) => {
        if (process.argv.indexOf('--with-classic-ps') >= 0) {
            let item = list.shift();
            assert.equal(item.vendorId, 0x0403);
            assert.equal(item.productId, 0x6015);
            cond.classic_ps = item.path;
            cond.classic.push(item.path);
            cond.boards.push(item.path);
        }
        if (process.argv.indexOf('--with-classic-as') >= 0) {
            let item = list.shift();
            assert.equal(item.vendorId, 0x0403);
            assert.equal(item.productId, 0x6015);
            cond.classic_as = item.path;
            cond.classic.push(item.path);
            cond.boards.push(item.path);
        }
        assert.equal(list.length, 0);
        run();
    })
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
})();

describe('(Test conditions)', function(){
    it('Bench tests (Virtual tests)', function(){});
    it('PERIDOT Classic (PS mode)', function(){
        cond.classic_ps || this.skip();
    });
    it('PERIDOT Classic (AS mode)', function(){
        cond.classic_as || this.skip();
    });
});

describe('(Test data generation)', function(){
    const { QUARTUS_ROOTDIR } = process.env;
    const EXT = (process.platform === 'win32' ? '.exe' : '');
    const QUARTUS_SH = QUARTUS_ROOTDIR && path.join(QUARTUS_ROOTDIR, '..', 'quartus', 'bin', 'quartus_sh' + EXT);
    const NIOS2_BIN = QUARTUS_ROOTDIR && path.join(QUARTUS_ROOTDIR, '..', 'nios2eds', 'sdk2', 'bin');
    let quartus_installed: boolean = null;
    if (QUARTUS_ROOTDIR) {
        if (fs.existsSync(QUARTUS_SH) && fs.existsSync(NIOS2_BIN)) {
            quartus_installed = true;
        }
    }
    it(`Check Quartus installation (QUARTUS_ROOTDIR="${QUARTUS_ROOTDIR}")`, quartus_installed && function(){})
    after(function(){
        CLASSIC_RBF_DATA = fs.readFileSync(CLASSIC_RBF_PATH);
    });
    if (!quartus_installed) {
        return;
    }
    const TEST_DIR = path.normalize(path.join(__dirname, '..', '..', 'test'));
    const SRC_DIR = path.join(TEST_DIR, 'app-src');
    const ELF_NAME = 'test.elf';
    const REGENERATE = (process.env.REGENERATE != null);

    interface GenerateOptions {
        board: string;
        cond: string;
        workdir: string;
        project: string;
        revision?: string;
        fpga_output: string;
        sopcinfo?: string;
        bsp_hal?: string;
        bsp_pkgs?: string[];
        apps: string[];
    };

    function generate(o: GenerateOptions){
        function doCommand(cmd: string, slow_sec: number, log: string, cwd?: string) {
            it(`${cmd.substr(0, 64)}...`, function(done){
                this.slow(slow_sec * 1000);
                this.timeout(0);
                exec(cmd, {cwd: cwd}, (error, stdout, stderr) => {
                    fs.writeFileSync(log, stdout);
                    if (error) {
                        console.error(error);
                    }
                    done(error);
                });
            })
        }
        let revision = o.revision || o.project;
        describe(o.board, function(){
            before(function(){
                o.cond || this.skip();
            });
            const fpga_dir = path.join(TEST_DIR, o.workdir);
            const out_dir = path.join(fpga_dir, 'output_files');
            describe('Compile FPGA design (This may take a few minutes...)', function(){
                before(function(){
                    REGENERATE || fs.existsSync(path.join(out_dir, o.fpga_output)) && this.skip();
                });
                doCommand(
                    `${QUARTUS_SH} --flow compile ${o.project} -c ${revision}`,
                    60*5,
                    path.join(fpga_dir, `${revision}.log`),
                    fpga_dir
                );
            });
            const sopcinfo = path.join(fpga_dir, o.sopcinfo || `${revision}_core.sopcinfo`);
            const sw_dir = path.join(fpga_dir, 'software');
            const bsp_dir = path.join(sw_dir, 'bsp');
            const hal = o.bsp_hal || 'hal';
            let bsp_regen = false;
            describe('Generate BSP', function(){
                before(function(){
                    REGENERATE || fs.existsSync(path.join(bsp_dir, 'public.mk')) && this.skip();
                    bsp_regen = true;
                    assert.isTrue(fs.existsSync(sopcinfo));
                    fs.ensureDirSync(bsp_dir);
                });
                doCommand(
                    `${path.join(NIOS2_BIN, 'nios2-bsp')} ${hal} ${bsp_dir} ${sopcinfo} ${
                        (o.bsp_pkgs || []).map((pkg) => `--cmd enable_sw_package ${pkg}`).join(' ')}`,
                    20,
                    path.join(bsp_dir, 'generate.log')
                );
            });
            describe('Build BSP', function(){
                before(function(){
                    REGENERATE || bsp_regen || fs.existsSync(path.join(bsp_dir, `lib${hal}_bsp.a`)) && this.skip();
                    assert.isTrue(fs.existsSync(path.join(bsp_dir, 'Makefile')));
                });
                doCommand(`make -C ${bsp_dir}`, 40, path.join(bsp_dir, 'build.log'));
            });
            o.apps.forEach((app) => {
                let app_dir = path.join(sw_dir, app);
                let src_name = `${app}.c`;
                let app_regen = false;
                describe(`Generate test application [${app}]`, function(){
                    before(function(){
                        REGENERATE || fs.existsSync(path.join(app_dir, 'Makefile')) && this.skip();
                        app_regen = true;
                        fs.ensureDirSync(app_dir);
                        fs.copySync(path.join(SRC_DIR, src_name), path.join(app_dir, src_name));
                    });
                    doCommand(
                        `${path.join(NIOS2_BIN, 'nios2-app-generate-makefile')
                            } --app-dir ${app_dir} --bsp-dir ${bsp_dir} --elf-name ${ELF_NAME
                            } --set DISABLE_ELFPATCH 1 --src-files ${src_name}`,
                        40,
                        path.join(app_dir, 'generate.log')
                    );
                });
                describe(`Build test application [${app}]`, function(){
                    before(function(){
                        REGENERATE || app_regen || fs.existsSync(path.join(app_dir, ELF_NAME)) && this.skip();
                        assert.isTrue(fs.existsSync(path.join(app_dir, 'Makefile')));
                    });
                    doCommand(
                        `make -C ${app_dir}`,
                        40,
                        path.join(app_dir, 'build.log')
                    );
                });
            });
        })
    }

    generate({
        board: 'PERIDOT Classic',
        cond: cond.classic_ps,
        workdir: 'peridot_classic',
        project: 'swi_testsuite',
        fpga_output: 'swi_testsuite.rbf',
        bsp_pkgs: ['peridot_rpc_server', 'peridot_client_fs', 'named_fifo'],
        apps: ['rpcsrv', 'clientfs']
    });
});
