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
                { name: 'Authentication', description: 'User authentication and profile management' },
                { name: 'Products', description: 'Public product catalog access' },
                { name: 'Categories', description: 'Product categories' },
                { name: 'Brands', description: 'Product brands' },
                { name: 'Cart', description: 'Shopping cart operations' },
                { name: 'Wishlist', description: 'User wishlist management' },
                { name: 'Addresses', description: 'User shipping addresses' },
                { name: 'Orders', description: 'Order placement and tracking' },
                { name: 'Payments', description: 'Payment processing' },
                { name: 'Reviews', description: 'Product reviews and ratings' },
                { name: 'Q&A', description: 'Product questions and answers' },
                { name: 'Refunds', description: 'Refund requests' },
                { name: 'Contact', description: 'Contact form submissions' },
                { name: 'Admin | Dashboard', description: 'Admin statistics and analytics' },
                { name: 'Admin | Products', description: 'Administrative product management' },
                { name: 'Admin | Categories', description: 'Administrative category management' },
                { name: 'Admin | Brands', description: 'Administrative brand management' },
                { name: 'Admin | Banners', description: 'Marketing banners management' },
                { name: 'Admin | Ads', description: 'Advertisement management' },
                { name: 'Admin | Inventory', description: 'Stock and inventory control' },
                { name: 'Admin | Shipping', description: 'Shipping zones and methods management' },
                { name: 'Admin | Coupons', description: 'Discount coupons management' },
                { name: 'Admin | Orders', description: 'Order fulfillment and management' },
                { name: 'Admin | Refunds', description: 'Refund request processing' },
                { name: 'Admin | Users', description: 'User management' },
                { name: 'Admin | Reviews', description: 'Review moderation' },
                { name: 'Admin | Contacts', description: 'Contact submission management' },
                { name: 'Admin | Q&A', description: 'Product Q&A management' },
                { name: 'Admin | Cart', description: 'Customer cart management' },
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
            tagsSorter: 'alpha',
            operationsSorter: 'alpha',
        },
        staticCSP: true,
        transformSpecificationClone: false,
    });
};

export default fp(swaggerPlugin, { name: 'swagger' });
