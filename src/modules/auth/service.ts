import bcrypt from 'bcrypt';
import { eq, and, gt } from 'drizzle-orm';
import { db } from '@/config/db.js';
import { users } from '@/db/schema/user.js';
import { otps } from '@/db/schema/otp.js';
import { ConflictError, UnauthorizedError, BadRequestError } from '@/shared/errors.js';

export class CustomerAuthService {
    // Generate an OTP code (mocked as static for dev, could be math.random)
    private generateOtp() {
        return Math.floor(1000 + Math.random() * 9000).toString();
    }

    async register(data: { name: string; phone: string; password: any }) {
        const existing = await db.query.users.findFirst({ where: eq(users.phone, data.phone) });
        if (existing) throw new ConflictError('Phone number already registered');

        const passwordHash = await bcrypt.hash(data.password, 12);
        const [user] = await db.insert(users).values({
            name: data.name,
            phone: data.phone,
            passwordHash,
            role: 'customer'
        }).returning();

        return this.sendOtp(data.phone);
    }

    async sendOtp(phone: string) {
        const otpCode = this.generateOtp();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

        await db.insert(otps).values({
            phone,
            code: otpCode,
            expiresAt,
        });

        // In production, integrate with SMS gateway here.
        console.log(`[SMS MOCK] Sent OTP ${otpCode} to ${phone}`);

        return true;
    }

    async verifyOtp(phone: string, inputOtp: string) {
        // Find latest valid OTP
        const activeOtp = await db.query.otps.findFirst({
            where: and(
                eq(otps.phone, phone),
                eq(otps.code, inputOtp),
                eq(otps.isUsed, false),
                gt(otps.expiresAt, new Date())
            ),
            orderBy: (otps, { desc }) => [desc(otps.createdAt)],
        });

        if (!activeOtp) throw new BadRequestError('Invalid or expired OTP');

        // Mark OTP as used
        await db.update(otps).set({ isUsed: true }).where(eq(otps.id, activeOtp.id));

        // Mark user phone as verified
        const [user] = await db.update(users)
            .set({ isPhoneVerified: true })
            .where(eq(users.phone, phone))
            .returning();

        if (!user) throw new BadRequestError('User not found');

        return user;
    }

    async login(data: { phone: string; password: any }) {
        const user = await db.query.users.findFirst({ where: eq(users.phone, data.phone) });
        if (!user || !user.passwordHash) throw new UnauthorizedError('Invalid phone or password');

        const valid = await bcrypt.compare(data.password, user.passwordHash);
        if (!valid) throw new UnauthorizedError('Invalid phone or password');

        if (!user.isPhoneVerified) throw new UnauthorizedError('Phone number not verified');

        return user;
    }

    async forgotPassword(phone: string) {
        const user = await db.query.users.findFirst({ where: eq(users.phone, phone) });
        if (!user) throw new BadRequestError('User not found');
        return this.sendOtp(phone);
    }

    async resetPassword(data: { phone: string; otp: string; newPassword: any }) {
        await this.verifyOtp(data.phone, data.otp);

        const passwordHash = await bcrypt.hash(data.newPassword, 12);
        await db.update(users).set({ passwordHash }).where(eq(users.phone, data.phone));
        return true;
    }

    async changePassword(userId: string, data: { oldPassword: any; newPassword: any }) {
        const user = await db.query.users.findFirst({ where: eq(users.id, userId) });
        if (!user || !user.passwordHash) throw new UnauthorizedError('User not found');

        const valid = await bcrypt.compare(data.oldPassword, user.passwordHash);
        if (!valid) throw new UnauthorizedError('Invalid old password');

        const passwordHash = await bcrypt.hash(data.newPassword, 12);
        await db.update(users).set({ passwordHash }).where(eq(users.id, userId));
        return true;
    }
}

export class OperatorAuthService {
    async login(data: { email: string; password: any }) {
        const user = await db.query.users.findFirst({ where: eq(users.email, data.email) });
        if (!user || !user.passwordHash) throw new UnauthorizedError('Invalid email or password');

        if (user.role !== 'operator' && user.role !== 'super_admin') {
            throw new UnauthorizedError('Unauthorized access');
        }

        const valid = await bcrypt.compare(data.password, user.passwordHash);
        if (!valid) throw new UnauthorizedError('Invalid email or password');

        return user;
    }
}

export class SharedAuthService {
    async getMe(userId: string) {
        const user = await db.query.users.findFirst({
            where: eq(users.id, userId),
            columns: { id: true, name: true, phone: true, email: true, role: true, status: true },
        });
        if (!user) throw new UnauthorizedError();
        return user;
    }
}

export const customerAuthService = new CustomerAuthService();
export const operatorAuthService = new OperatorAuthService();
export const sharedAuthService = new SharedAuthService();
