import { env } from '@/config/env.js';
import type {
    CreateOrderRequest,
    BulkCreateOrderItem,
    CreateReturnRequest,
    CreateOrderResponse,
    StatusResponse,
    BalanceResponse,
    BulkCreateResponseItem,
    CreateReturnResponse,
} from './schema.js';

// ─── HTTP Client ─────────────────────────────────────────────────────────────

class SteadfastApiClient {
    private baseUrl: string;
    private apiKey: string;
    private secretKey: string;

    constructor() {
        this.baseUrl = env.STEADFAST_BASE_URL;
        this.apiKey = env.STEADFAST_API_KEY ?? '';
        this.secretKey = env.STEADFAST_SECRET_KEY ?? '';
    }

    get isConfigured(): boolean {
        return Boolean(this.apiKey && this.secretKey);
    }

    private get headers(): Record<string, string> {
        return {
            'Api-Key': this.apiKey,
            'Secret-Key': this.secretKey,
            'Content-Type': 'application/json',
        };
    }

    private async request<T>(
        method: 'GET' | 'POST',
        path: string,
        body?: unknown,
    ): Promise<T> {
        if (!this.isConfigured) {
            throw new Error('Steadfast Courier is not configured. Set STEADFAST_API_KEY and STEADFAST_SECRET_KEY.');
        }

        const url = `${this.baseUrl}${path}`;
        const init: RequestInit = {
            method,
            headers: this.headers,
        };
        if (body !== undefined) {
            init.body = JSON.stringify(body);
        }

        const response = await fetch(url, init);

        if (!response.ok) {
            const errorBody = await response.text();
            throw new Error(`Steadfast API error (${response.status}): ${errorBody}`);
        }

        return response.json() as Promise<T>;
    }

    // ─── 1. Create Order ──────────────────────────────────────────────────────

    async createOrder(data: CreateOrderRequest): Promise<CreateOrderResponse> {
        return this.request<CreateOrderResponse>('POST', '/create_order', data);
    }

    // ─── 2. Bulk Order Create ─────────────────────────────────────────────────

    async bulkCreateOrders(data: BulkCreateOrderItem[]): Promise<BulkCreateResponseItem[]> {
        const result = await this.request<BulkCreateResponseItem[] | { data: BulkCreateResponseItem[] }>(
            'POST',
            '/create_order/bulk-order',
            { data },
        );
        // API may return array directly or wrapped in { data: [...] }
        if (Array.isArray(result)) return result;
        return (result as any).data ?? [];
    }

    // ─── 3. Delivery Status ───────────────────────────────────────────────────

    async getStatusByConsignmentId(consignmentId: number): Promise<StatusResponse> {
        return this.request<StatusResponse>('GET', `/status_by_cid/${consignmentId}`);
    }

    async getStatusByInvoice(invoice: string): Promise<StatusResponse> {
        return this.request<StatusResponse>('GET', `/status_by_invoice/${encodeURIComponent(invoice)}`);
    }

    async getStatusByTrackingCode(trackingCode: string): Promise<StatusResponse> {
        return this.request<StatusResponse>('GET', `/status_by_trackingcode/${encodeURIComponent(trackingCode)}`);
    }

    // ─── 4. Current Balance ───────────────────────────────────────────────────

    async getBalance(): Promise<BalanceResponse> {
        return this.request<BalanceResponse>('GET', '/get_balance');
    }

    // ─── 5. Create Return Request ─────────────────────────────────────────────

    async createReturnRequest(data: CreateReturnRequest): Promise<CreateReturnResponse> {
        const body: Record<string, unknown> = {};
        if (data.consignment_id) body.consignment_id = data.consignment_id;
        if (data.invoice) body.invoice = data.invoice;
        if (data.tracking_code) body.tracking_code = data.tracking_code;
        if (data.reason) body.reason = data.reason;
        return this.request<CreateReturnResponse>('POST', '/create_return_request', body);
    }

    // ─── 6. Get Single Return Request ─────────────────────────────────────────

    async getReturnRequest(id: number): Promise<CreateReturnResponse> {
        return this.request<CreateReturnResponse>('GET', `/get_return_request/${id}`);
    }

    // ─── 7. Get All Return Requests ───────────────────────────────────────────

    async getReturnRequests(): Promise<CreateReturnResponse[]> {
        const result = await this.request<CreateReturnResponse[] | { data: CreateReturnResponse[] }>(
            'GET',
            '/get_return_requests',
        );
        if (Array.isArray(result)) return result;
        return (result as any).data ?? [];
    }

    // ─── 8. Get Payments ──────────────────────────────────────────────────────

    async getPayments(): Promise<unknown> {
        return this.request('GET', '/payments');
    }

    // ─── 9. Get Single Payment with Consignments ──────────────────────────────

    async getSinglePayment(paymentId: number): Promise<unknown> {
        return this.request('GET', `/payments/${paymentId}`);
    }

    // ─── 10. Get Police Stations ──────────────────────────────────────────────

    async getPoliceStations(): Promise<unknown> {
        return this.request('GET', '/police_stations');
    }
}

export const steadfastClient = new SteadfastApiClient();
