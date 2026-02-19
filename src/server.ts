import { buildApp } from '@/app.js';
import { env } from '@/config/env.js';

async function start() {
    const app = await buildApp();

    // ─── Graceful shutdown ────────────────────────────────────────────────────
    const signals: NodeJS.Signals[] = ['SIGTERM', 'SIGINT'];
    for (const signal of signals) {
        process.once(signal, async () => {
            app.log.info(`Received ${signal} — shutting down gracefully`);
            await app.close();
            process.exit(0);
        });
    }

    process.on('uncaughtException', (err) => {
        app.log.error({ err }, 'Uncaught exception');
        process.exit(1);
    });

    process.on('unhandledRejection', (reason) => {
        app.log.error({ reason }, 'Unhandled rejection');
        process.exit(1);
    });

    // ─── Listen ───────────────────────────────────────────────────────────────
    try {
        await app.listen({ port: env.PORT, host: '0.0.0.0' });
    } catch (err) {
        app.log.error(err);
        process.exit(1);
    }
}

void start();
