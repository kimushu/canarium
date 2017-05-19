import * as path from 'path';
import * as fs from 'fs-extra';
import * as chai from 'chai';
import { exec, ExecOptionsWithStringEncoding } from 'child_process';
chai.use(require('chai-as-promised'));
const {assert} = chai;
import * as elfy from 'elfy';
import { Canarium } from '../src/canarium';

export const TEST_DIR = path.join(__dirname, '..', '..', 'test');
export const SWI = {
    REG_CLASSID: 0,
    REG_MESSAGE: 6,
};

elfy.constants.machine['113'] = 'nios2';

export function writeElf(canarium: Canarium, data: Buffer): Promise<void> {
    return Promise.resolve()
    .then(() => {
        return elfy.parse(data);
    })
    .then((elf) => {
        if (elf.machine !== 'nios2') {
            throw new Error('Not NiosII program');
        }
        return elf.body.programs.reduce(
            (promise, program) => {
                if (program.type !== 'load') {
                    return promise;
                }
                return promise
                .then(() => {
                    return canarium.avm.write(program.vaddr, program.data);
                });
            }, Promise.resolve()
        );
    });
}

export const cond = {
    classic_ps: <string>null,
    classic_as: <string>null,
    classic:    <string[]>[],
    boards:     <string[]>[],
};

export interface TestData {
    board: string;
    workdir: string;
    project: string;
    revision?: string;
    fpga_output_name: string;
    fpga_output_data?: Buffer;
    sopcinfo?: string;
    bsp_hal?: string;
    bsp_pkgs?: string[];
    apps: {[n: string]: Buffer};
    info?: any;
};
export interface TestDataCollection {
    [n: string]: TestData;
}

export const testdatacol: TestDataCollection = {
    classic_ps: {
        board: 'PERIDOT Classic',
        workdir: 'peridot_classic',
        project: 'swi_testsuite',
        fpga_output_name: 'swi_testsuite.rbf',
        bsp_pkgs: ['peridot_rpc_server', 'peridot_client_fs', 'named_fifo'],
        apps: {
            rpcsrv: null,
            clientfs: null,
        },
        info: {
            CLASSID:    0x72a09001,
            SDRAM_BASE: 0x00000000,
            SDRAM_SPAN: 8*1024*1024,
            SWI_BASE:   0x10000000,
            RESET_BASE: 0x10000020,
        }
    }
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

    const TEST_DIR = path.normalize(path.join(__dirname, '..', '..', 'test'));
    const SRC_DIR = path.join(TEST_DIR, 'app-src');
    const ELF_NAME = 'test.elf';
    const REGENERATE = (process.env.REGENERATE != null);

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
    Object.keys(testdatacol).forEach((key) => {
        const d = testdatacol[key];
        d.revision || (d.revision = d.project);
        d.bsp_hal || (d.bsp_hal = 'hal');
        const fpga_dir = path.join(TEST_DIR, d.workdir);
        const out_dir = path.join(fpga_dir, 'output_files');
        const sw_dir = path.join(fpga_dir, 'software');
        const bsp_dir = path.join(sw_dir, 'bsp');
        after(function(){
            d.fpga_output_data = fs.readFileSync(path.join(out_dir, d.fpga_output_name));
            Object.keys(d.apps).forEach((app) => {
                d.apps[app] = fs.readFileSync(path.join(sw_dir, app, ELF_NAME));
            });
        });
        if (!quartus_installed) {
            return;
        }
        describe(d.board, function(){
            before(function(){
                cond[key] || this.skip();
            });
            describe('Compile FPGA design (This may take a few minutes...)', function(){
                before(function(){
                    REGENERATE || fs.existsSync(path.join(out_dir, d.fpga_output_name)) && this.skip();
                });
                doCommand(
                    `${QUARTUS_SH} --flow compile ${d.project} -c ${d.revision}`,
                    60*5,
                    path.join(fpga_dir, `${d.revision}.log`),
                    fpga_dir
                );
            });
            const sopcinfo = path.join(fpga_dir, d.sopcinfo || `${d.revision}_core.sopcinfo`);
            let bsp_regen = false;
            describe('Generate BSP', function(){
                before(function(){
                    REGENERATE || fs.existsSync(path.join(bsp_dir, 'public.mk')) && this.skip();
                    bsp_regen = true;
                    assert.isTrue(fs.existsSync(sopcinfo));
                    fs.ensureDirSync(bsp_dir);
                });
                doCommand(
                    `${path.join(NIOS2_BIN, 'nios2-bsp')} ${d.bsp_hal} ${bsp_dir} ${sopcinfo} ${
                        (d.bsp_pkgs || []).map((pkg) => `--cmd enable_sw_package ${pkg}`).join(' ')}`,
                    20,
                    path.join(bsp_dir, 'generate.log')
                );
            });
            describe('Build BSP', function(){
                before(function(){
                    REGENERATE || bsp_regen || fs.existsSync(path.join(bsp_dir, `lib${d.bsp_hal}_bsp.a`)) && this.skip();
                    assert.isTrue(fs.existsSync(path.join(bsp_dir, 'Makefile')));
                });
                doCommand(`make -C ${bsp_dir}`, 40, path.join(bsp_dir, 'build.log'));
            });
            Object.keys(d.apps).forEach((app) => {
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
        });
    });
});
