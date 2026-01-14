import * as cp from 'child_process';
import * as path from 'path';

export class NewmanRunner {
    private currentProcess: cp.ChildProcess | null = null;

    public run(collectionPath: string, proxyUrl: string): Promise<string> {
        return new Promise((resolve, reject) => {
            if (this.currentProcess) {
                return reject(new Error('Newman is already running.'));
            }

            // Construct arguments
            // newman run <collection> --env-var "http_proxy=<proxy>" --env-var "https_proxy=<proxy>"
            // Note: Newman uses standard HTTP_PROXY env vars or --env-var usually works if requests respect it.
            // But better yet, simply setting env vars for the process.
            
            const env = { 
                ...process.env,
                HTTP_PROXY: proxyUrl,
                HTTPS_PROXY: proxyUrl
            };

            const args = ['run', collectionPath]; // Add --insecure if needed for self-signed certs proxy

            console.log(`Starting Newman: newman ${args.join(' ')} with proxy ${proxyUrl}`);

            // Assuming 'newman' is in the PATH. If not, configuration might be needed.
            this.currentProcess = cp.spawn('newman', args, { env });

            let output = '';

            this.currentProcess.stdout?.on('data', (data) => {
                output += data.toString();
            });

            this.currentProcess.stderr?.on('data', (data) => {
                output += data.toString();
            });

            this.currentProcess.on('error', (err) => {
                reject(err);
                this.currentProcess = null;
            });

            this.currentProcess.on('close', (code) => {
                this.currentProcess = null;
                if (code === 0) {
                    resolve(output);
                } else {
                    reject(new Error(`Newman finished with exit code ${code}\nLog:\n${output}`));
                }
            });
        });
    }

    public stop() {
        if (this.currentProcess) {
            this.currentProcess.kill();
            this.currentProcess = null;
        }
    }
}
