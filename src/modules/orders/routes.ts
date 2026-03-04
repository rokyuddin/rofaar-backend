import type { FastifyPluginAsync } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { orderService } from './service.js';
import { CreateOrderSchema, UpdateOrderStatusSchema, OrderPaginationSchema } from './schema.js';
import { success, paginated } from '@/shared/response.js';
import { IdParamSchema } from '@/shared/types.js';
import { createSwaggerConfig } from '@/shared/swagger.js';
import type { CreateOrderBody, UpdateOrderStatusBody, OrderPaginationQuery } from './schema.js';

const ordersPlugin: FastifyPluginAsync = async (fastify) => {
    // ─── User Routes ─────────────────────────────────────────────────────────
    fastify.register(async (instance) => {
        const app = instance.withTypeProvider<ZodTypeProvider>();
        app.addHook('onRequest', fastify.authenticate);

        // POST /orders/create
        app.post('/create', {
            schema: {
                ...createSwaggerConfig(['User | Orders'], 'Create Order', 'Place a new order from cart', true),
                body: CreateOrderSchema,
            },
            handler: async (request, reply) => {
                const order = await orderService.create(request.user.id, request.body as CreateOrderBody);
                return reply.code(201).send(success({ orderId: order.id }, 'Order placed successfully'));
            },
        });

        // GET /orders/list
        app.get('/list', {
            schema: {
                ...createSwaggerConfig(['User | Orders'], 'List My Orders', 'Get current user\'s orders', true),
            },
            handler: async (request) => {
                const userOrders = await orderService.list(request.user.id);
                return success(userOrders);
            },
        });

        // GET /orders/:id
        app.get('/:id', {
            schema: {
                ...createSwaggerConfig(['User | Orders'], 'Get Order Details', 'Get details of a specific order', true),
                params: IdParamSchema,
            },
            handler: async (request) => {
                const order = await orderService.getById(request.user.id, request.params.id);
                return success(order);
            },
        });
    }, { prefix: '/orders' });

    // ─── Admin Routes ────────────────────────────────────────────────────────
    fastify.register(async (instance) => {
        const app = instance.withTypeProvider<ZodTypeProvider>();
        app.addHook('onRequest', fastify.adminOnly);

        // GET /admin/orders/list
        app.get('/list', {
            schema: {
                ...createSwaggerConfig(['Admin | Orders'], 'List All Orders', 'Get all orders with pagination', true),
                querystring: OrderPaginationSchema,
            },
            handler: async (request) => {
                const query = request.query as OrderPaginationQuery;
                const { rows, total } = await orderService.listAll(query);
                return paginated(rows, {
                    page: query.page,
                    limit: query.limit,
                    total,
                });
            },
        });

        // GET /admin/orders/recent
        app.get('/recent', {
            schema: {
                ...createSwaggerConfig(['Admin | Orders'], 'Recent Orders', 'Get recent orders for dashboard', true),
            },
            handler: async () => {
                const result = await orderService.getRecentOrders();
                return success(result);
            },
        });

        // GET /admin/orders/:id
        app.get('/:id', {
            schema: {
                ...createSwaggerConfig(['Admin | Orders'], 'Get Admin Order Details', 'Get full details of any order', true),
                params: IdParamSchema,
            },
            handler: async (request) => {
                const order = await orderService.getAdminById(request.params.id);
                return success(order);
            },
        });

        // PUT /admin/orders/update
        app.put('/update', {
            schema: {
                ...createSwaggerConfig(['Admin | Orders'], 'Update Order Status', 'Update order or payment status', true),
                body: UpdateOrderStatusSchema,
            },
            handler: async (request) => {
                const { id, ...data } = request.body as UpdateOrderStatusBody;
                const result = await orderService.updateStatus(id, data);
                return success(result, 'Order status updated');
            },
        });
    }, { prefix: '/admin/orders' });
};

export default ordersPlugin;
