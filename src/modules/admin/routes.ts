import type { FastifyPluginAsync } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { adminService } from './service.js';
import { getSalesChartSchema, getTopSellingSchema } from './schema.js';

const adminRoutes: FastifyPluginAsync = async (fastify) => {
    fastify.register(async (instance) => {
        const app = instance.withTypeProvider<ZodTypeProvider>();
        app.addHook('onRequest', fastify.authenticate);
        app.addHook('onRequest', fastify.adminOnly);

        app.get('/stats', {
            schema: {
                tags: ['Admin | Dashboard'],
                summary: 'Get summary stats',
                description: 'Returns high-level statistics for the admin dashboard.',
            },
            handler: async (_request, reply) => {
                const stats = await adminService.getStats();
                return reply.sendOk(stats);
            },
        });

        app.get('/recent-orders', {
            schema: {
                tags: ['Admin | Dashboard'],
                summary: 'Get recent orders',
                description: 'Returns the 10 most recent orders for the dashboard.',
            },
            handler: async (_request, reply) => {
                const orders = await adminService.getRecentOrders();
                return reply.sendOk(orders);
            },
        });

        app.get('/sales-chart', {
            schema: {
                tags: ['Admin | Dashboard'],
                summary: 'Get sales chart data',
                description: 'Returns sales revenue and order counts over time for charting.',
                querystring: getSalesChartSchema
            },
            handler: async (request, reply) => {
                const data = await adminService.getSalesChartData(request.query);
                return reply.sendOk(data);
            },
        });

        app.get('/top-products', {
            schema: {
                tags: ['Admin | Dashboard'],
                summary: 'Get top selling products',
                description: 'Returns a list of the best-selling products by revenue and quantity.',
                querystring: getTopSellingSchema
            },
            handler: async (request, reply) => {
                const data = await adminService.getTopSellingProducts(request.query);
                return reply.sendOk(data);
            },
        });
    });
};

export default adminRoutes;
