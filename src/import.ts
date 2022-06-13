
async function updateUI() {
    return new Promise(resolve => setTimeout(resolve));
}

async function load_wasm(wasm_binary: ArrayBuffer) {
    let memory : WebAssembly.Memory;
    const imports = {
        env: {
            emscripten_notify_memory_growth: () => 0
        },
        wasi_snapshot_preview1: {
            proc_exit: (code: number) => {
                throw code;
            },
            fd_seek: () => {},
            fd_write: (fd: number, iovsPtr: number, iov: number, nwrittenPtr: number): number => {

                const memoryView = new DataView(memory.buffer);

                let nwritten = 0;
                let str = '';
                for (let i = 0; i < iov; ++i) {
                    const buf = memoryView.getUint32(iovsPtr + 8 * i, true);
                    const size = memoryView.getUint32(iovsPtr + 8 * i + 4, true);
                    nwritten += size;
                    const jsbuf = new Uint8Array(memory.buffer, buf, size);
                    str += String.fromCharCode(...jsbuf);
                }

                memoryView.setUint32(nwrittenPtr, nwritten, true);

                const consoleout = document.getElementById("consoleout") as HTMLParagraphElement;
                consoleout.innerText += str;

                return 0;



            },
            fd_read: () => {},
            fd_close: () => {},
            environ_sizes_get: () => 0,
            environ_get: () => 0

        }
    };
    const { instance } = await WebAssembly.instantiate(wasm_binary, imports);


    memory = instance.exports.memory as WebAssembly.Memory;

    try {
        (instance.exports._start as Function)();
    }
    catch (e) {
        console.log(`Exited with code: ${e}`)
    }
}