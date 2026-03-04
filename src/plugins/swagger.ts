import fp from 'fastify-plugin';
import type { FastifyPluginAsync } from 'fastify';
import fastifySwagger from '@fastify/swagger';
import fastifySwaggerUI from '@fastify/swagger-ui';
import { jsonSchemaTransform } from 'fastify-type-provider-zod';
import { env } from '@/config/env.js';

const swaggerPlugin: FastifyPluginAsync = async (fastify) => {
    if (env.ENABLE_SWAGGER !== 'true') {
        return;
    }

    await fastify.register(fastifySwagger, {
        openapi: {
            info: {
                title: 'Rofaar E-commerce API',
                description: 'Comprehensive e-commerce REST API with authentication, product management, orders, payments, and more.',
                version: '1.0.0',
                contact: {
                    name: 'Rofaar API Support',
                    email: 'support@rofaar.com',
                },
            },
            servers: [
                {
                    url: `http://${env.API_HOST}`,
                    description: 'Development server',
                },
                {
                    url: 'https://api.rofaar.com',
                    description: 'Production server',
                },
            ],
            tags: [
                { name: 'Authentication', description: 'User authentication and authorization' },
                { name: 'Categories', description: 'Public product categories access' },
                { name: 'Admin | Categories', description: 'Administrative category management' },
                { name: 'Tags', description: 'Public product tags access' },
                { name: 'Admin | Tags', description: 'Administrative tag management' },
                { name: 'Products', description: 'Public product catalog access' },
                { name: 'Admin | Products', description: 'Administrative product management' },
                { name: 'User | Cart', description: 'User shopping cart operations' },
                { name: 'Orders', description: 'Order management and tracking' },
                { name: 'User | Wishlist', description: 'User product wishlist operations' },
                { name: 'User | Addresses', description: 'User address management' },
                { name: 'Combos', description: 'Product bundles and combos' },
                { name: 'Reviews', description: 'Product reviews and ratings' },
                { name: 'Payments', description: 'Payment processing and webhooks' },
                { name: 'Admin', description: 'General administrative operations' },
            ],
            components: {
                securitySchemes: {
                    bearerAuth: {
                        type: 'http',
                        scheme: 'bearer',
                        bearerFormat: 'JWT',
                        description: 'Enter your JWT token',
                    },
                },
            },
            security: [{ bearerAuth: [] }],
        },
        transform: jsonSchemaTransform,
    });

    await fastify.register(fastifySwaggerUI, {
        routePrefix: '/documentation',
        uiConfig: {
            docExpansion: 'list',
            deepLinking: false,
            filter: true,
        },
        staticCSP: true,
        transformSpecificationClone: false,
    });
};

export default fp(swaggerPlugin, { name: 'swagger' });
