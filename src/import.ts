
async function updateUI() {
    return new Promise(resolve => setTimeout(resolve, 20));
}
const fileStr = '1 2 3';
let filePtr = 0;


async function load_wasm(wasm_binary: ArrayBuffer) {
    let memory : WebAssembly.Memory;
    const consoleout = document.getElementById("consoleout") as HTMLTextAreaElement;
    const textDecoder = new TextDecoder();
    const imports = {
        env: {
            emscripten_notify_memory_growth: () => 0
        },
        wasi_snapshot_preview1: {
            proc_exit: (code: number) => {
                throw code;
            },
            fd_seek: () => 0,
            fd_write: (fd: number, iovsPtr: number, iov: number, nwrittenPtr: number): number => {

                const memU32 = new Uint32Array(memory.buffer);

                let nwritten = 0;

                for (let i = 0; i < iov; ++i) {
                    const buf = memU32[(iovsPtr >> 2) + 2 * i];
                    const size = memU32[(iovsPtr >> 2) + 2 * i + 1];
                    nwritten += size;
                    const jsbuf = new Uint8Array(memory.buffer, buf, size);
                    consoleout.value += textDecoder.decode(jsbuf);
                }

                memU32[nwrittenPtr>>2] = nwritten;

                return 0;



            },
            fd_read: (fd: number, iovsPtr: number, iov: number, nreadPtr: number) => {
                if (fd !== 3) throw "Error, reading an empty file";
                const memoryView = new DataView(memory.buffer);
                let nread = 0;
                for (let i = 0; i < iov; ++i) {
                    const buf = memoryView.getUint32(iovsPtr + 8 * i, true);
                    const size = memoryView.getUint32(iovsPtr + 8 * i + 4, true);
                    for (let j = 0; j < size && filePtr < fileStr.length; ++j, ++filePtr, ++nread) {
                        memoryView.setUint8(buf + j, fileStr.charCodeAt(filePtr));
                    }
                }
                memoryView.setUint32(nreadPtr, nread, true);
                return 0;
            },
            fd_close: () => 0,
            environ_sizes_get: (argcPtr: number, argvBufSizePtr: number) => {
                const memU32 = new Uint32Array(memory.buffer);
                memU32[argcPtr >> 2] = 0;
                memU32[argvBufSizePtr >> 2] = 0;
                return 0;
            },
            environ_get: () => 0,
            random_get: (bufPtr: number, length: number) => {
                window.crypto.getRandomValues(new Uint8Array(memory.buffer, bufPtr, length));
                return 0;
            },
            clock_time_get: (id: number, precision: bigint, timePtr: number) => {
                const memoryView = new DataView(memory.buffer);
                memoryView.setBigUint64(timePtr, BigInt(Math.round(performance.now() * 1000000 / Number(precision))), true);
                return 0;
            }
        }
    };
    const { instance } = await WebAssembly.instantiate(wasm_binary, imports);


    memory = instance.exports.memory as WebAssembly.Memory;

    try {
        (instance.exports._start as Function)();
    }
    catch (e) {
        consoleout.value += `\nExited with code: ${e}`;
    }
}