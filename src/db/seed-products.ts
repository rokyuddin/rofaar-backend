import 'dotenv/config';

/**
 * Product Seed Script
 * -------------------
 * Bulk-inserts a curated catalog of products with 3+ relevant Unsplash
 * images per product. Idempotent: skips any product whose slug already
 * exists.
 *
 * Run with:
 *   npx tsx src/db/seed-products.ts
 */

import { db } from '@/config/db.js';
import { products, productImages } from '@/db/schema/product.js';
import { categories } from '@/db/schema/category.js';
import { brands } from '@/db/schema/brand.js';
import { eq } from 'drizzle-orm';

// ─── Image catalogue (Unsplash, 800x800 crop) ────────────────────────────────
// Each entry maps a product slug → 3 relevant image URLs.

const IMG = {
    earbuds: [
        'https://images.unsplash.com/photo-1572569511254-d8f925fe2cbb?w=800&h=800&fit=crop&auto=format&q=80',
        'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=800&h=800&fit=crop&auto=format&q=80',
        'https://images.unsplash.com/photo-1606220588913-b3aacb4d2f46?w=800&h=800&fit=crop&auto=format&q=80',
    ],
    smartwatch: [
        'https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=800&h=800&fit=crop&auto=format&q=80',
        'https://images.unsplash.com/photo-1579586337278-3befd40fd17a?w=800&h=800&fit=crop&auto=format&q=80',
        'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&h=800&fit=crop&auto=format&q=80',
    ],
    powerbank: [
        'https://images.unsplash.com/photo-1609091839311-d5365f9ff1c5?w=800&h=800&fit=crop&auto=format&q=80',
        'https://images.unsplash.com/photo-1583863788434-e58a36330cf0?w=800&h=800&fit=crop&auto=format&q=80',
        'https://images.unsplash.com/photo-1601972602288-3be527b4f18c?w=800&h=800&fit=crop&auto=format&q=80',
    ],
    charger: [
        'https://images.unsplash.com/photo-1583863788434-e58a36330cf0?w=800&h=800&fit=crop&auto=format&q=80',
        'https://images.unsplash.com/photo-1601972602288-3be527b4f18c?w=800&h=800&fit=crop&auto=format&q=80',
        'https://images.unsplash.com/photo-1609091839311-d5365f9ff1c5?w=800&h=800&fit=crop&auto=format&q=80',
    ],
    gamingMouse: [
        'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=800&h=800&fit=crop&auto=format&q=80',
        'https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?w=800&h=800&fit=crop&auto=format&q=80',
        'https://images.unsplash.com/photo-1629429407759-01cd3d7cfb38?w=800&h=800&fit=crop&auto=format&q=80',
    ],
    mechanicalKeyboard: [
        'https://images.unsplash.com/photo-1595044426077-d36d9236d54a?w=800&h=800&fit=crop&auto=format&q=80',
        'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=800&h=800&fit=crop&auto=format&q=80',
        'https://images.unsplash.com/photo-1618384887929-16ec33fab9ef?w=800&h=800&fit=crop&auto=format&q=80',
    ],
    laptopStand: [
        'https://images.unsplash.com/photo-1593642632559-0c6d3fc62b89?w=800&h=800&fit=crop&auto=format&q=80',
        'https://images.unsplash.com/photo-1587826080692-f439cd0b70da?w=800&h=800&fit=crop&auto=format&q=80',
        'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800&h=800&fit=crop&auto=format&q=80',
    ],
    webcam: [
        'https://images.unsplash.com/photo-1623934199716-dc28818a2cc7?w=800&h=800&fit=crop&auto=format&q=80',
        'https://images.unsplash.com/photo-1611162616475-46b635cb6868?w=800&h=800&fit=crop&auto=format&q=80',
        'https://images.unsplash.com/photo-1587826080692-f439cd0b70da?w=800&h=800&fit=crop&auto=format&q=80',
    ],
    headphones: [
        'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&h=800&fit=crop&auto=format&q=80',
        'https://images.unsplash.com/photo-1583394838336-acd977736f90?w=800&h=800&fit=crop&auto=format&q=80',
        'https://images.unsplash.com/photo-1545127398-14699f92334b?w=800&h=800&fit=crop&auto=format&q=80',
    ],
    bluetoothSpeaker: [
        'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=800&h=800&fit=crop&auto=format&q=80',
        'https://images.unsplash.com/photo-1545454675-3531b543be5d?w=800&h=800&fit=crop&auto=format&q=80',
        'https://images.unsplash.com/photo-1589003077984-894e133dabab?w=800&h=800&fit=crop&auto=format&q=80',
    ],
    deskLamp: [
        'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=800&h=800&fit=crop&auto=format&q=80',
        'https://images.unsplash.com/photo-1513506003901-1e6a229e2d15?w=800&h=800&fit=crop&auto=format&q=80',
        'https://images.unsplash.com/photo-1565636291777-2c2c5f6e5e7c?w=800&h=800&fit=crop&auto=format&q=80',
    ],
    phoneTripod: [
        'https://images.unsplash.com/photo-1606986628253-49ebbf913943?w=800&h=800&fit=crop&auto=format&q=80',
        'https://images.unsplash.com/photo-1622279457486-62dcc4a431d6?w=800&h=800&fit=crop&auto=format&q=80',
        'https://images.unsplash.com/photo-1551649001-7a2482d98d05?w=800&h=800&fit=crop&auto=format&q=80',
    ],
    fitnessTracker: [
        'https://images.unsplash.com/photo-1575311373937-040b8e1fd5b6?w=800&h=800&fit=crop&auto=format&q=80',
        'https://images.unsplash.com/photo-1557935683-c7b8c6c2c0c0?w=800&h=800&fit=crop&auto=format&q=80',
        'https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=800&h=800&fit=crop&auto=format&q=80',
    ],
    wirelessCharger: [
        'https://images.unsplash.com/photo-1586953208448-b95a79798f07?w=800&h=800&fit=crop&auto=format&q=80',
        'https://images.unsplash.com/photo-1601784551446-20c9e07cdbdb?w=800&h=800&fit=crop&auto=format&q=80',
        'https://images.unsplash.com/photo-1601972602288-3be527b4f18c?w=800&h=800&fit=crop&auto=format&q=80',
    ],
    actionCamera: [
        'https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=800&h=800&fit=crop&auto=format&q=80',
        'https://images.unsplash.com/photo-1606983340126-99ab4feaa64a?w=800&h=800&fit=crop&auto=format&q=80',
        'https://images.unsplash.com/photo-1564466809058-bf4114d55352?w=800&h=800&fit=crop&auto=format&q=80',
    ],
    miniProjector: [
        'https://images.unsplash.com/photo-1626128665085-483747621778?w=800&h=800&fit=crop&auto=format&q=80',
        'https://images.unsplash.com/photo-1593352216840-48eb0f6a7d4a?w=800&h=800&fit=crop&auto=format&q=80',
        'https://images.unsplash.com/photo-1629477462143-7ec5de2d3a7a?w=800&h=800&fit=crop&auto=format&q=80',
    ],
    externalSsd: [
        'https://images.unsplash.com/photo-1597872200969-2b65d56bd16b?w=800&h=800&fit=crop&auto=format&q=80',
        'https://images.unsplash.com/photo-1535303311164-664fc9ec6532?w=800&h=800&fit=crop&auto=format&q=80',
        'https://images.unsplash.com/photo-1597872200969-2b65d56bd16b?w=800&h=800&fit=crop&auto=format&q=80',
    ],
    usbHub: [
        'https://images.unsplash.com/photo-1625948515291-69613efd103f?w=800&h=800&fit=crop&auto=format&q=80',
        'https://images.unsplash.com/photo-1601972602288-3be527b4f18c?w=800&h=800&fit=crop&auto=format&q=80',
        'https://images.unsplash.com/photo-1583863788434-e58a36330cf0?w=800&h=800&fit=crop&auto=format&q=80',
    ],
    monitorLight: [
        'https://images.unsplash.com/photo-1611532736597-de2d4265fba3?w=800&h=800&fit=crop&auto=format&q=80',
        'https://images.unsplash.com/photo-1593642632559-0c6d3fc62b89?w=800&h=800&fit=crop&auto=format&q=80',
        'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800&h=800&fit=crop&auto=format&q=80',
    ],
    deskOrganizer: [
        'https://images.unsplash.com/photo-1593642634367-d91a13502b49?w=800&h=800&fit=crop&auto=format&q=80',
        'https://images.unsplash.com/photo-1544819667-9bfc1de23d4d?w=800&h=800&fit=crop&auto=format&q=80',
        'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=800&h=800&fit=crop&auto=format&q=80',
    ],
    coffeeGrinder: [
        'https://images.unsplash.com/photo-1611854779393-1b2da9d400fe?w=800&h=800&fit=crop&auto=format&q=80',
        'https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=800&h=800&fit=crop&auto=format&q=80',
        'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=800&h=800&fit=crop&auto=format&q=80',
    ],
    electricKettle: [
        'https://images.unsplash.com/photo-1571115332105-7ce6b2a2c69c?w=800&h=800&fit=crop&auto=format&q=80',
        'https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=800&h=800&fit=crop&auto=format&q=80',
        'https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=800&h=800&fit=crop&auto=format&q=80',
    ],
    airFryer: [
        'https://images.unsplash.com/photo-1648475038305-3b3a4b3e0a8b?w=800&h=800&fit=crop&auto=format&q=80',
        'https://images.unsplash.com/photo-1626509653291-18d9a934b9db?w=800&h=800&fit=crop&auto=format&q=80',
        'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?w=800&h=800&fit=crop&auto=format&q=80',
    ],
    vacuumCleaner: [
        'https://images.unsplash.com/photo-1558317374-067fb5f30001?w=800&h=800&fit=crop&auto=format&q=80',
        'https://images.unsplash.com/photo-1581578017093-cd30fce4eeb7?w=800&h=800&fit=crop&auto=format&q=80',
        'https://images.unsplash.com/photo-1610557892470-55d42e5f5b91?w=800&h=800&fit=crop&auto=format&q=80',
    ],
    robotVacuum: [
        'https://images.unsplash.com/photo-1610557892470-55d42e5f5b91?w=800&h=800&fit=crop&auto=format&q=80',
        'https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&h=800&fit=crop&auto=format&q=80',
        'https://images.unsplash.com/photo-1581578017093-cd30fce4eeb7?w=800&h=800&fit=crop&auto=format&q=80',
    ],
    waterBottle: [
        'https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=800&h=800&fit=crop&auto=format&q=80',
        'https://images.unsplash.com/photo-1523362628745-0c100150b504?w=800&h=800&fit=crop&auto=format&q=80',
        'https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=800&h=800&fit=crop&auto=format&q=80',
    ],
    travelBackpack: [
        'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800&h=800&fit=crop&auto=format&q=80',
        'https://images.unsplash.com/photo-1581605405669-fcdf81165afa?w=800&h=800&fit=crop&auto=format&q=80',
        'https://images.unsplash.com/photo-1547949003-9792a18a2601?w=800&h=800&fit=crop&auto=format&q=80',
    ],
    campingLantern: [
        'https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?w=800&h=800&fit=crop&auto=format&q=80',
        'https://images.unsplash.com/photo-1572207931233-e8e7e2d7c2c7?w=800&h=800&fit=crop&auto=format&q=80',
        'https://images.unsplash.com/photo-1574169208507-84376144848b?w=800&h=800&fit=crop&auto=format&q=80',
    ],
    yogaMat: [
        'https://images.unsplash.com/photo-1545205597-3d9d02c29597?w=800&h=800&fit=crop&auto=format&q=80',
        'https://images.unsplash.com/photo-1599447421416-3414500d18a5?w=800&h=800&fit=crop&auto=format&q=80',
        'https://images.unsplash.com/photo-1599058917212-d750089bc07e?w=800&h=800&fit=crop&auto=format&q=80',
    ],
    resistanceBands: [
        'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=800&h=800&fit=crop&auto=format&q=80',
        'https://images.unsplash.com/photo-1599058917212-d750089bc07e?w=800&h=800&fit=crop&auto=format&q=80',
        'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&h=800&fit=crop&auto=format&q=80',
    ],
    runningShoes: [
        'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&h=800&fit=crop&auto=format&q=80',
        'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=800&h=800&fit=crop&auto=format&q=80',
        'https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=800&h=800&fit=crop&auto=format&q=80',
    ],
    sunglasses: [
        'https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=800&h=800&fit=crop&auto=format&q=80',
        'https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=800&h=800&fit=crop&auto=format&q=80',
        'https://images.unsplash.com/photo-1473496169904-658ba7c44d8a?w=800&h=800&fit=crop&auto=format&q=80',
    ],
    leatherWallet: [
        'https://images.unsplash.com/photo-1627123424574-724758594e93?w=800&h=800&fit=crop&auto=format&q=80',
        'https://images.unsplash.com/photo-1606503825008-909a67e63c3d?w=800&h=800&fit=crop&auto=format&q=80',
        'https://images.unsplash.com/photo-1517254797898-04edd251bfb3?w=800&h=800&fit=crop&auto=format&q=80',
    ],
    crossbodyBag: [
        'https://images.unsplash.com/photo-1591561954557-26941169b49e?w=800&h=800&fit=crop&auto=format&q=80',
        'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=800&h=800&fit=crop&auto=format&q=80',
        'https://images.unsplash.com/photo-1590874103328-eac38a683ce7?w=800&h=800&fit=crop&auto=format&q=80',
    ],
    winterJacket: [
        'https://images.unsplash.com/photo-1551488831-00ddcb6c6bd3?w=800&h=800&fit=crop&auto=format&q=80',
        'https://images.unsplash.com/photo-1539533018447-63fcce2678e3?w=800&h=800&fit=crop&auto=format&q=80',
        'https://images.unsplash.com/photo-1559551409-dadc959f76b8?w=800&h=800&fit=crop&auto=format&q=80',
    ],
    cottonTshirt: [
        'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=800&h=800&fit=crop&auto=format&q=80',
        'https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?w=800&h=800&fit=crop&auto=format&q=80',
        'https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?w=800&h=800&fit=crop&auto=format&q=80',
    ],
    officeNotebook: [
        'https://images.unsplash.com/photo-1531346878377-a5be20888e57?w=800&h=800&fit=crop&auto=format&q=80',
        'https://images.unsplash.com/photo-1455390582262-044cdead277a?w=800&h=800&fit=crop&auto=format&q=80',
        'https://images.unsplash.com/photo-1517842645767-c639042777db?w=800&h=800&fit=crop&auto=format&q=80',
    ],
    gelPen: [
        'https://images.unsplash.com/photo-1583485088034-697b5bc36b92?w=800&h=800&fit=crop&auto=format&q=80',
        'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=800&h=800&fit=crop&auto=format&q=80',
        'https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d?w=800&h=800&fit=crop&auto=format&q=80',
    ],
    sketchbook: [
        'https://images.unsplash.com/photo-1455390582262-044cdead277a?w=800&h=800&fit=crop&auto=format&q=80',
        'https://images.unsplash.com/photo-1517842645767-c639042777db?w=800&h=800&fit=crop&auto=format&q=80',
        'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=800&h=800&fit=crop&auto=format&q=80',
    ],
    petFountain: [
        'https://images.unsplash.com/photo-1583337130417-3346a1be7dee?w=800&h=800&fit=crop&auto=format&q=80',
        'https://images.unsplash.com/photo-1601758174039-3e8c9b8c1d5a?w=800&h=800&fit=crop&auto=format&q=80',
        'https://images.unsplash.com/photo-1545249390-6bdfa286032f?w=800&h=800&fit=crop&auto=format&q=80',
    ],
    catScratchingPost: [
        'https://images.unsplash.com/photo-1545249390-6bdfa286032f?w=800&h=800&fit=crop&auto=format&q=80',
        'https://images.unsplash.com/photo-1574144611937-0df059b5ef3e?w=800&h=800&fit=crop&auto=format&q=80',
        'https://images.unsplash.com/photo-1561948955-570b270e7c36?w=800&h=800&fit=crop&auto=format&q=80',
    ],
} as const;

type ImageKey = keyof typeof IMG;

const CATEGORY_ID = '2640d515-dcc4-4b97-a73c-d0b49954b1c1';
const BRAND_ID = 'c4273001-166d-4396-8b52-a73f3d9b089e';

const CATEGORY_SLUG = 'general';
const CATEGORY_NAME = 'General';
const BRAND_SLUG = 'premium';
const BRAND_NAME = 'Premium';

// ─── Product catalogue ───────────────────────────────────────────────────────

type ProductSeed = {
    name: string;
    slug: string;
    description: string;
    price: number;
    costPrice: number;
    categoryId: string;
    brandId: string;
    discountPercentage: number;
    stock: number;
    isActive: boolean;
    images: ImageKey;
};

const PRODUCT_SEEDS: ProductSeed[] = [
    { name: 'Wireless Bluetooth Earbuds', slug: 'wireless-earbuds', description: 'Wireless Bluetooth Earbuds premium quality product.', price: 1049, costPrice: 735, categoryId: CATEGORY_ID, brandId: BRAND_ID, discountPercentage: 10, stock: 100, isActive: true, images: 'earbuds' },
    { name: 'Smart Watch', slug: 'smart-watch', description: 'Smart Watch premium quality product.', price: 1099, costPrice: 770, categoryId: CATEGORY_ID, brandId: BRAND_ID, discountPercentage: 10, stock: 100, isActive: true, images: 'smartwatch' },
    { name: 'Portable Power Bank', slug: 'power-bank', description: 'Portable Power Bank premium quality product.', price: 1149, costPrice: 805, categoryId: CATEGORY_ID, brandId: BRAND_ID, discountPercentage: 10, stock: 100, isActive: true, images: 'powerbank' },
    { name: 'USB C Fast Charger', slug: 'usb-c-charger', description: 'USB C Fast Charger premium quality product.', price: 1199, costPrice: 840, categoryId: CATEGORY_ID, brandId: BRAND_ID, discountPercentage: 10, stock: 100, isActive: true, images: 'charger' },
    { name: 'Gaming Mouse', slug: 'gaming-mouse', description: 'Gaming Mouse premium quality product.', price: 1249, costPrice: 875, categoryId: CATEGORY_ID, brandId: BRAND_ID, discountPercentage: 10, stock: 100, isActive: true, images: 'gamingMouse' },
    { name: 'Mechanical Keyboard', slug: 'mechanical-keyboard', description: 'Mechanical Keyboard premium quality product.', price: 1299, costPrice: 910, categoryId: CATEGORY_ID, brandId: BRAND_ID, discountPercentage: 10, stock: 100, isActive: true, images: 'mechanicalKeyboard' },
    { name: 'Laptop Stand', slug: 'laptop-stand', description: 'Laptop Stand premium quality product.', price: 1349, costPrice: 945, categoryId: CATEGORY_ID, brandId: BRAND_ID, discountPercentage: 10, stock: 100, isActive: true, images: 'laptopStand' },
    { name: 'HD Webcam', slug: 'webcam', description: 'HD Webcam premium quality product.', price: 1399, costPrice: 980, categoryId: CATEGORY_ID, brandId: BRAND_ID, discountPercentage: 10, stock: 100, isActive: true, images: 'webcam' },
    { name: 'Noise Cancelling Headphones', slug: 'headphones', description: 'Noise Cancelling Headphones premium quality product.', price: 1449, costPrice: 1015, categoryId: CATEGORY_ID, brandId: BRAND_ID, discountPercentage: 10, stock: 100, isActive: true, images: 'headphones' },
    { name: 'Bluetooth Speaker', slug: 'bluetooth-speaker', description: 'Bluetooth Speaker premium quality product.', price: 1499, costPrice: 1050, categoryId: CATEGORY_ID, brandId: BRAND_ID, discountPercentage: 10, stock: 100, isActive: true, images: 'bluetoothSpeaker' },
    { name: 'LED Desk Lamp', slug: 'desk-lamp', description: 'LED Desk Lamp premium quality product.', price: 1549, costPrice: 1085, categoryId: CATEGORY_ID, brandId: BRAND_ID, discountPercentage: 10, stock: 100, isActive: true, images: 'deskLamp' },
    { name: 'Phone Tripod', slug: 'phone-tripod', description: 'Phone Tripod premium quality product.', price: 1599, costPrice: 1120, categoryId: CATEGORY_ID, brandId: BRAND_ID, discountPercentage: 10, stock: 100, isActive: true, images: 'phoneTripod' },
    { name: 'Fitness Tracker', slug: 'fitness-tracker', description: 'Fitness Tracker premium quality product.', price: 1649, costPrice: 1155, categoryId: CATEGORY_ID, brandId: BRAND_ID, discountPercentage: 10, stock: 100, isActive: true, images: 'fitnessTracker' },
    { name: 'Wireless Charger', slug: 'wireless-charger', description: 'Wireless Charger premium quality product.', price: 1699, costPrice: 1190, categoryId: CATEGORY_ID, brandId: BRAND_ID, discountPercentage: 10, stock: 100, isActive: true, images: 'wirelessCharger' },
    { name: 'Action Camera', slug: 'action-camera', description: 'Action Camera premium quality product.', price: 1749, costPrice: 1225, categoryId: CATEGORY_ID, brandId: BRAND_ID, discountPercentage: 10, stock: 100, isActive: true, images: 'actionCamera' },
    { name: 'Mini Projector', slug: 'mini-projector', description: 'Mini Projector premium quality product.', price: 1799, costPrice: 1260, categoryId: CATEGORY_ID, brandId: BRAND_ID, discountPercentage: 10, stock: 100, isActive: true, images: 'miniProjector' },
    { name: 'External SSD', slug: 'external-ssd', description: 'External SSD premium quality product.', price: 1849, costPrice: 1295, categoryId: CATEGORY_ID, brandId: BRAND_ID, discountPercentage: 10, stock: 100, isActive: true, images: 'externalSsd' },
    { name: 'USB Hub', slug: 'usb-hub', description: 'USB Hub premium quality product.', price: 1899, costPrice: 1330, categoryId: CATEGORY_ID, brandId: BRAND_ID, discountPercentage: 10, stock: 100, isActive: true, images: 'usbHub' },
    { name: 'Monitor Light Bar', slug: 'monitor-light', description: 'Monitor Light Bar premium quality product.', price: 1949, costPrice: 1365, categoryId: CATEGORY_ID, brandId: BRAND_ID, discountPercentage: 10, stock: 100, isActive: true, images: 'monitorLight' },
    { name: 'Desk Organizer', slug: 'desk-organizer', description: 'Desk Organizer premium quality product.', price: 1999, costPrice: 1400, categoryId: CATEGORY_ID, brandId: BRAND_ID, discountPercentage: 10, stock: 100, isActive: true, images: 'deskOrganizer' },
    { name: 'Coffee Grinder', slug: 'coffee-grinder', description: 'Coffee Grinder premium quality product.', price: 2049, costPrice: 1435, categoryId: CATEGORY_ID, brandId: BRAND_ID, discountPercentage: 10, stock: 100, isActive: true, images: 'coffeeGrinder' },
    { name: 'Electric Kettle', slug: 'electric-kettle', description: 'Electric Kettle premium quality product.', price: 2099, costPrice: 1470, categoryId: CATEGORY_ID, brandId: BRAND_ID, discountPercentage: 10, stock: 100, isActive: true, images: 'electricKettle' },
    { name: 'Air Fryer', slug: 'air-fryer', description: 'Air Fryer premium quality product.', price: 2149, costPrice: 1505, categoryId: CATEGORY_ID, brandId: BRAND_ID, discountPercentage: 10, stock: 100, isActive: true, images: 'airFryer' },
    { name: 'Vacuum Cleaner', slug: 'vacuum-cleaner', description: 'Vacuum Cleaner premium quality product.', price: 2199, costPrice: 1540, categoryId: CATEGORY_ID, brandId: BRAND_ID, discountPercentage: 10, stock: 100, isActive: true, images: 'vacuumCleaner' },
    { name: 'Robot Vacuum', slug: 'robot-vacuum', description: 'Robot Vacuum premium quality product.', price: 2249, costPrice: 1575, categoryId: CATEGORY_ID, brandId: BRAND_ID, discountPercentage: 10, stock: 100, isActive: true, images: 'robotVacuum' },
    { name: 'Stainless Water Bottle', slug: 'water-bottle', description: 'Stainless Water Bottle premium quality product.', price: 2299, costPrice: 1610, categoryId: CATEGORY_ID, brandId: BRAND_ID, discountPercentage: 10, stock: 100, isActive: true, images: 'waterBottle' },
    { name: 'Travel Backpack', slug: 'travel-backpack', description: 'Travel Backpack premium quality product.', price: 2349, costPrice: 1645, categoryId: CATEGORY_ID, brandId: BRAND_ID, discountPercentage: 10, stock: 100, isActive: true, images: 'travelBackpack' },
    { name: 'Camping Lantern', slug: 'camping-lantern', description: 'Camping Lantern premium quality product.', price: 2399, costPrice: 1680, categoryId: CATEGORY_ID, brandId: BRAND_ID, discountPercentage: 10, stock: 100, isActive: true, images: 'campingLantern' },
    { name: 'Yoga Mat', slug: 'yoga-mat', description: 'Yoga Mat premium quality product.', price: 2449, costPrice: 1715, categoryId: CATEGORY_ID, brandId: BRAND_ID, discountPercentage: 10, stock: 100, isActive: true, images: 'yogaMat' },
    { name: 'Resistance Bands', slug: 'resistance-bands', description: 'Resistance Bands premium quality product.', price: 2499, costPrice: 1750, categoryId: CATEGORY_ID, brandId: BRAND_ID, discountPercentage: 10, stock: 100, isActive: true, images: 'resistanceBands' },
    { name: 'Running Shoes', slug: 'running-shoes', description: 'Running Shoes premium quality product.', price: 2549, costPrice: 1785, categoryId: CATEGORY_ID, brandId: BRAND_ID, discountPercentage: 10, stock: 100, isActive: true, images: 'runningShoes' },
    { name: 'Classic Sunglasses', slug: 'sunglasses', description: 'Classic Sunglasses premium quality product.', price: 2599, costPrice: 1820, categoryId: CATEGORY_ID, brandId: BRAND_ID, discountPercentage: 10, stock: 100, isActive: true, images: 'sunglasses' },
    { name: 'Leather Wallet', slug: 'leather-wallet', description: 'Leather Wallet premium quality product.', price: 2649, costPrice: 1855, categoryId: CATEGORY_ID, brandId: BRAND_ID, discountPercentage: 10, stock: 100, isActive: true, images: 'leatherWallet' },
    { name: 'Crossbody Bag', slug: 'crossbody-bag', description: 'Crossbody Bag premium quality product.', price: 2699, costPrice: 1890, categoryId: CATEGORY_ID, brandId: BRAND_ID, discountPercentage: 10, stock: 100, isActive: true, images: 'crossbodyBag' },
    { name: 'Winter Jacket', slug: 'winter-jacket', description: 'Winter Jacket premium quality product.', price: 2749, costPrice: 1925, categoryId: CATEGORY_ID, brandId: BRAND_ID, discountPercentage: 10, stock: 100, isActive: true, images: 'winterJacket' },
    { name: 'Cotton T Shirt', slug: 'cotton-tshirt', description: 'Cotton T Shirt premium quality product.', price: 2799, costPrice: 1960, categoryId: CATEGORY_ID, brandId: BRAND_ID, discountPercentage: 10, stock: 100, isActive: true, images: 'cottonTshirt' },
    { name: 'Office Notebook', slug: 'office-notebook', description: 'Office Notebook premium quality product.', price: 2849, costPrice: 1995, categoryId: CATEGORY_ID, brandId: BRAND_ID, discountPercentage: 10, stock: 100, isActive: true, images: 'officeNotebook' },
    { name: 'Gel Pen Set', slug: 'gel-pen', description: 'Gel Pen Set premium quality product.', price: 2899, costPrice: 2030, categoryId: CATEGORY_ID, brandId: BRAND_ID, discountPercentage: 10, stock: 100, isActive: true, images: 'gelPen' },
    { name: 'Sketchbook', slug: 'sketchbook', description: 'Sketchbook premium quality product.', price: 2949, costPrice: 2065, categoryId: CATEGORY_ID, brandId: BRAND_ID, discountPercentage: 10, stock: 100, isActive: true, images: 'sketchbook' },
    { name: 'Pet Water Fountain', slug: 'pet-fountain', description: 'Pet Water Fountain premium quality product.', price: 2999, costPrice: 2100, categoryId: CATEGORY_ID, brandId: BRAND_ID, discountPercentage: 10, stock: 100, isActive: true, images: 'petFountain' },
    { name: 'Cat Scratching Post', slug: 'cat-scratching-post', description: 'Cat Scratching Post premium quality product.', price: 3049, costPrice: 2135, categoryId: CATEGORY_ID, brandId: BRAND_ID, discountPercentage: 10, stock: 100, isActive: true, images: 'catScratchingPost' },
];

// ─── Seed ─────────────────────────────────────────────────────────────────────

async function ensureEntity(
    table: typeof categories | typeof brands,
    name: string,
    slug: string,
): Promise<string> {
    const existing = table === categories
        ? await db.query.categories.findFirst({ where: eq(categories.slug, slug) })
        : await db.query.brands.findFirst({ where: eq(brands.slug, slug) });
    if (existing) return existing.id;

    const [row] = await db.insert(table).values({ name, slug }).returning();
    if (!row) throw new Error(`Failed to create ${slug}`);
    return row.id;
}

async function seed() {
    console.log(`🌱  Ensuring default category & brand…`);
    const catId = await ensureEntity(categories, CATEGORY_NAME, CATEGORY_SLUG);
    const brandId = await ensureEntity(brands, BRAND_NAME, BRAND_SLUG);
    console.log(`  ✅  Category: ${CATEGORY_SLUG} (${catId})`);
    console.log(`  ✅  Brand:    ${BRAND_SLUG} (${brandId})\n`);

    console.log(`🌱  Seeding ${PRODUCT_SEEDS.length} products with images…\n`);

    let created = 0;
    let skipped = 0;
    let failed = 0;

    for (const seed of PRODUCT_SEEDS) {
        try {
            const existing = await db.query.products.findFirst({
                where: eq(products.slug, seed.slug),
            });

            if (existing) {
                console.log(`  ⏭️   Skip (exists): ${seed.slug}`);
                skipped += 1;
                continue;
            }

            const imageUrls = IMG[seed.images];

            const inserted = await db.transaction(async (tx) => {
                const [product] = await tx
                    .insert(products)
                    .values({
                        name: seed.name,
                        slug: seed.slug,
                        description: seed.description,
                        price: seed.price.toString(),
                        costPrice: seed.costPrice.toString(),
                        discountPercentage: seed.discountPercentage,
                        stock: seed.stock,
                        isActive: seed.isActive,
                        categoryId: catId,
                        brandId: brandId,
                    })
                    .returning();

                if (!product) throw new Error('Insert returned no row');

                await tx.insert(productImages).values(
                    imageUrls.map((url, sortOrder) => ({
                        productId: product.id,
                        url,
                        sortOrder,
                    })),
                );

                return product;
            });

            console.log(`  ✅  Created: ${seed.slug} (${imageUrls.length} images)`);
            created += 1;
        } catch (err) {
            console.error(`  ❌  Failed: ${seed.slug}`, err instanceof Error ? err.message : err);
            failed += 1;
        }
    }

    console.log(`\n📊  Summary — created: ${created}, skipped: ${skipped}, failed: ${failed}`);
    process.exit(failed > 0 ? 1 : 0);
}

seed().catch((err) => {
    console.error('❌  Seed failed:', err);
    process.exit(1);
});
