import bcrypt from 'bcrypt';
import crypto from 'node:crypto';
import { eq, and, gt, or, desc } from 'drizzle-orm';
import { db } from '@/config/db.js';
import { users } from '@/db/schema/user.js';
import { roles } from '@/db/schema/rbac.js';
import { otps } from '@/db/schema/otp.js';
import { refreshTokens } from '@/db/schema/session.js';
import { ConflictError, UnauthorizedError, NotFoundError, BadRequestError } from '@/shared/errors.js';

export class AuthService {
    /** Step 1: Send OTP for registration. */
    async sendRegistrationOtp(phone: string) {
        // Check if user already exists and is fully registered
        const existingUser = await db.query.users.findFirst({
            where: eq(users.phone, phone),
        });

        if (existingUser && existingUser.registrationStep === 'completed') {
            throw new ConflictError('User already registered with this phone number');
        }

        // Generate 6-digit OTP
        const code = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 mins expiry

        // If user doesn't exist, create a stub
        if (!existingUser) {
            const customerRole = await db.query.roles.findFirst({
                where: eq(roles.name, 'customer'),
            });
            if (!customerRole) throw new NotFoundError('Default role not seeded');

            await db.insert(users).values({
                phone,
                roleId: customerRole.id,
                registrationStep: 'pending_otp',
            });
        } else {
            // Update existing stub user
            await db.update(users).set({
                registrationStep: 'pending_otp',
            }).where(eq(users.id, existingUser.id));
        }

        // Save OTP
        await db.insert(otps).values({
            phone,
            code,
            type: 'registration',
            expiresAt,
        });

        // TODO: Integrate with SMS Service
        console.log(`[SMS MOCK] Registration OTP for ${phone}: ${code}`);
    }

    /** Single-step registration: creates a pending user awaiting admin approval. */
    async registerDirect(data: { name: string; phone: string; email?: string | undefined; password: string }) {
        const existingPhone = await db.query.users.findFirst({
            where: eq(users.phone, data.phone),
        });
        if (existingPhone) throw new ConflictError('User already registered with this phone number');

        if (data.email) {
            const existingEmail = await db.query.users.findFirst({
                where: eq(users.email, data.email),
            });
            if (existingEmail) throw new ConflictError('Email already in use');
        }

        const customerRole = await db.query.roles.findFirst({
            where: eq(roles.name, 'customer'),
        });
        if (!customerRole) throw new NotFoundError('Default role not seeded');

        const passwordHash = await bcrypt.hash(data.password, 12);

        await db.insert(users).values({
            name: data.name,
            phone: data.phone,
            email: data.email ?? null,
            passwordHash,
            roleId: customerRole.id,
            registrationStep: 'pending',
            isVerified: false,
            isActive: true,
        });
    }

    /** Step 2: Verify OTP and return a temporary registration token. */
    async verifyRegistrationOtp(phone: string, code: string) {
        const otpRecord = await db.query.otps.findFirst({
            where: and(
                eq(otps.phone, phone),
                eq(otps.code, code),
                eq(otps.type, 'registration'),
                eq(otps.isUsed, false),
                gt(otps.expiresAt, new Date())
            ),
            orderBy: [desc(otps.createdAt)],
        });

        if (!otpRecord) throw new BadRequestError('Invalid or expired OTP');

        // Mark OTP as used
        await db.update(otps).set({ isUsed: true }).where(eq(otps.id, otpRecord.id));

        // Generate temporary registration token
        const registrationToken = crypto.randomBytes(32).toString('hex');
        const tokenExpires = new Date(Date.now() + 30 * 60 * 1000); // 30 mins expiry

        await db.update(users).set({
            isVerified: true,
            registrationStep: 'pending_profile',
            resetToken: registrationToken, // Reusing resetToken field for simplicity
            resetTokenExpires: tokenExpires,
        }).where(eq(users.phone, phone));

        return registrationToken;
    }

    /** Step 3: Complete registration with profile info. */
    async completeRegistration(token: string, data: { name: string; email: string; password: string }) {
        const user = await db.query.users.findFirst({
            where: and(
                eq(users.resetToken, token),
                eq(users.registrationStep, 'pending_profile'),
                gt(users.resetTokenExpires, new Date())
            ),
        });

        if (!user) throw new BadRequestError('Invalid or expired registration token');

        // Check if email is already taken
        const existingEmail = await db.query.users.findFirst({
            where: eq(users.email, data.email),
        });
        if (existingEmail) throw new ConflictError('Email already in use');

        const passwordHash = await bcrypt.hash(data.password, 12);

        const [updatedUser] = await db.update(users).set({
            name: data.name,
            email: data.email,
            passwordHash,
            registrationStep: 'completed',
            resetToken: null,
            resetTokenExpires: null,
            updatedAt: new Date(),
        }).where(eq(users.id, user.id)).returning();

        const role = await db.query.roles.findFirst({ where: eq(roles.id, updatedUser!.roleId) });

        return { ...updatedUser!, role: role?.name || 'customer' };
    }

    /** Login and return the user record with role name. */
    async login(data: { phone: string; password: string }) {
        const user = await db.query.users.findFirst({
            where: eq(users.phone, data.phone),
            with: { role: { columns: { name: true } } },
        });

        if (!user) throw new UnauthorizedError('Invalid phone or password');
        if (!user.isActive) throw new UnauthorizedError('Account is inactive');
        if (user.registrationStep === 'pending') {
            throw new UnauthorizedError('Your account is pending approval. Please wait for admin verification.');
        }
        if (user.registrationStep !== 'completed') {
            throw new UnauthorizedError('Please complete your registration first.');
        }

        const valid = await bcrypt.compare(data.password, user.passwordHash!);
        if (!valid) throw new UnauthorizedError('Invalid phone or password');

        return { ...user, role: user.role.name };
    }

    /** Admin Login */
    async adminLogin(data: { phone: string; password: string }) {
        const user = await this.login(data);
        const adminRoles = ['super_admin', 'admin', 'operator'];
        
        if (!adminRoles.includes(user.role)) {
            throw new UnauthorizedError('Access denied. Admin privileges required.');
        }

        return user;
    }

    /** Forgot Password: send OTP via phone. */
    async forgotPassword(phone: string) {
        const user = await db.query.users.findFirst({ 
            where: eq(users.phone, phone)
        });
        if (!user) return; // Silent return for security

        const code = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 mins expiry

        await db.insert(otps).values({
            phone,
            code,
            type: 'password_reset',
            expiresAt,
        });

        // TODO: Integrate with SMS Service
        console.log(`[SMS MOCK] Password reset OTP for ${phone}: ${code}`);
    }

    /** Verify Password Reset OTP: returns a secure reset token if OTP is valid. */
    async verifyResetOtp(phone: string, otp: string) {
        const otpRecord = await db.query.otps.findFirst({
            where: and(
                eq(otps.phone, phone),
                eq(otps.code, otp),
                eq(otps.type, 'password_reset'),
                eq(otps.isUsed, false),
                gt(otps.expiresAt, new Date())
            ),
            orderBy: [desc(otps.createdAt)],
        });

        if (!otpRecord) throw new BadRequestError('Invalid or expired OTP');

        // Mark OTP as used
        await db.update(otps).set({ isUsed: true }).where(eq(otps.id, otpRecord.id));

        const resetToken = crypto.randomBytes(32).toString('hex');
        const resetTokenExpires = new Date(Date.now() + 30 * 60 * 1000); // 30 mins expiry

        await db
            .update(users)
            .set({ 
                resetToken, 
                resetTokenExpires
            })
            .where(eq(users.phone, phone));

        return resetToken;
    }

    /** Reset Password using the secure reset token. */
    async resetPasswordWithToken(resetToken: string, newPassword: string) {
        const user = await db.query.users.findFirst({
            where: and(
                eq(users.resetToken, resetToken),
                gt(users.resetTokenExpires, new Date())
            ),
        });

        if (!user) throw new BadRequestError('Invalid or expired reset token');

        const passwordHash = await bcrypt.hash(newPassword, 12);
        await db
            .update(users)
            .set({ 
                passwordHash, 
                resetToken: null, 
                resetTokenExpires: null 
            })
            .where(eq(users.id, user.id));
    }

    /** Change Password for authenticated users. */
    async changePassword(userId: string, data: { oldPassword: string; newPassword: string }) {
        const user = await db.query.users.findFirst({ where: eq(users.id, userId) });
        if (!user) throw new NotFoundError('User');

        const valid = await bcrypt.compare(data.oldPassword, user.passwordHash!);
        if (!valid) throw new BadRequestError('Current password is incorrect');

        const passwordHash = await bcrypt.hash(data.newPassword, 12);
        await db
            .update(users)
            .set({ passwordHash, updatedAt: new Date() })
            .where(eq(users.id, userId));
    }

    /** Get Profile */
    async getMe(userId: string) {
        const user = await db.query.users.findFirst({
            where: eq(users.id, userId),
            columns: { id: true, name: true, email: true, roleId: true, isVerified: true, createdAt: true },
            with: {
                role: { columns: { name: true } },
            },
        });
        if (!user) throw new UnauthorizedError();
        return {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role.name,
            isVerified: user.isVerified,
            createdAt: user.createdAt.toISOString(),
        };
    }

    /** Generate and store a new refresh token. */
    async createRefreshToken(userId: string) {
        const token = crypto.randomBytes(40).toString('hex');
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

        await db.insert(refreshTokens).values({
            userId,
            token,
            expiresAt,
        });

        return token;
    }

    /** Refresh Access Token: returns a new pair of tokens (rotation). */
    async refreshToken(oldToken: string) {
        const tokenRecord = await db.query.refreshTokens.findFirst({
            where: and(
                eq(refreshTokens.token, oldToken),
                gt(refreshTokens.expiresAt, new Date())
            ),
        });

        if (!tokenRecord) throw new UnauthorizedError('Invalid or expired refresh token');

        // Delete the old token (rotation)
        await db.delete(refreshTokens).where(eq(refreshTokens.id, tokenRecord.id));

        // Create new refresh token
        const newToken = await this.createRefreshToken(tokenRecord.userId);
        
        // Fetch user info for JWT payload
        const user = await db.query.users.findFirst({
            where: eq(users.id, tokenRecord.userId),
            with: { role: { columns: { name: true } } },
        });

        if (!user || !user.isActive) throw new UnauthorizedError('User account is inactive');

        return { userId: user.id, refreshToken: newToken };
    }

    /** Logout: revoke a refresh token. */
    async logout(token: string) {
        await db.delete(refreshTokens).where(eq(refreshTokens.token, token));
    }

    /** Update User Profile. */
    async updateProfile(userId: string, data: { name?: string | undefined; email?: string | undefined }) {
        if (data.email) {
            const emailOwner = await db.query.users.findFirst({
                where: eq(users.email, data.email),
            });
            if (emailOwner && emailOwner.id !== userId) {
                throw new ConflictError('Email already in use by another account');
            }
        }

        await db.update(users).set({
            ...data,
            updatedAt: new Date(),
        }).where(eq(users.id, userId));
    }
}

export const authService = new AuthService();
