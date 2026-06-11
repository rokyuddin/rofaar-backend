import type { FastifyPluginAsync, FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { authService } from "./service.js";
import {
  RegisterBodySchema,
  RequestOtpBodySchema,
  VerifyOtpBodySchema,
  CompleteRegistrationBodySchema,
  AuthResponseSchema,
  LoginBodySchema,
  AdminLoginBodySchema,
  ForgotPasswordBodySchema,
  VerifyResetOtpBodySchema,
  ResetPasswordWithTokenSchema,
  RefreshTokenBodySchema,
  MeResponseSchema,
  ChangePasswordBodySchema,
  UpdateProfileBodySchema,
} from "./schema.js";

const createSharedAuthRoutes =
  (fastify: FastifyInstance): FastifyPluginAsync =>
  async (instance) => {
    const app = instance.withTypeProvider<ZodTypeProvider>();
    app.addHook("onRequest", fastify.authenticate);

    app.get("/me", {
      schema: {
        tags: ["Authentication"],
        summary: "Get current user profile",
        description:
          "Returns the profile information of the currently authenticated user.",
        response: { 200: MeResponseSchema },
      },
      handler: async (request, reply) => {
        const user = await authService.getMe(request.user.id);
        return reply.sendOk(user);
      },
    });

    app.post("/change-password", {
      schema: {
        tags: ["Authentication"],
        summary: "Change password",
        description:
          "Changes the password of the currently authenticated user.",
        body: ChangePasswordBodySchema,
      },
      handler: async (request, reply) => {
        await authService.changePassword(request.user.id, request.body);
        return reply.sendOk(null, "Password changed successfully.");
      },
    });

    app.patch("/profile", {
      schema: {
        tags: ["Authentication"],
        summary: "Update profile",
        description:
          "Updates the name or email of the currently authenticated user.",
        body: UpdateProfileBodySchema,
      },
      handler: async (request, reply) => {
        await authService.updateProfile(request.user.id, request.body);
        return reply.sendOk(null, "Profile updated successfully.");
      },
    });

    app.post("/refresh", {
      schema: {
        tags: ["Authentication"],
        summary: "Refresh access token",
        description: "Obtains a new access token using a refresh token.",
        body: RefreshTokenBodySchema,
      },
      handler: async (request, reply) => {
        const result = await authService.refreshToken(
          request.body.refreshToken,
        );
        const token = fastify.jwt.sign({ sub: result.userId });
        return reply.sendOk({ token, refreshToken: result.refreshToken });
      },
    });

    app.post("/logout", {
      schema: {
        tags: ["Authentication"],
        summary: "Logout",
        description: "Invalidates the refresh token and logs out the user.",
        body: RefreshTokenBodySchema,
      },
      handler: async (request, reply) => {
        await authService.logout(request.body.refreshToken);
        return reply.sendOk(null, "Logged out successfully");
      },
    });
  };

const authRoutes: FastifyPluginAsync = async (fastify) => {
  const sharedAuthRoutes = createSharedAuthRoutes(fastify);

  // ─── Public Routes ─────────────────────────────────────────────────────────
  fastify.register(
    async (instance) => {
      const app = instance.withTypeProvider<ZodTypeProvider>();

      app.post("/register", {
        schema: {
          tags: ["Authentication"],
          summary: "Register a new account",
          description:
            "Registers a new user with name, phone, and password. Email is optional. Account will be pending until approved by an admin.",
          body: RegisterBodySchema,
        },
        handler: async (request, reply) => {
          await authService.registerDirect(request.body);
          return reply.sendCreated(null, "Registration successful. Please wait for admin approval.");
        },
      });
      app.post("/register/send-otp", {
        schema: {
          tags: ["Authentication"],
          summary: "Send registration OTP",
          description:
            "Sends a registration OTP to the provided phone number. Account creation will be pending until OTP verification and admin approval.",
          body: RequestOtpBodySchema,
        },
        config: {
          rateLimit: { max: 3, timeWindow: "5 minutes" },
        },
        handler: async (request, reply) => {
          await authService.sendRegistrationOtp(request.body.phone);
          return reply.sendOk(null, "OTP sent to your phone number.");
        },
      });

      app.post("/register/verify-otp", {
        schema: {
          tags: ["Authentication"],
          summary: "Verify registration OTP",
          description:
            "Verifies the registration OTP and returns a temporary token for completing profile setup.",
          body: VerifyOtpBodySchema,
          response: { 200: AuthResponseSchema },
        },
        config: {
          rateLimit: { max: 5, timeWindow: "5 minutes" },
        },
        handler: async (request, reply) => {
          const token = await authService.verifyRegistrationOtp(
            request.body.phone,
            request.body.otp,
          );
          return reply.sendOk({ token });
        },
      });

      app.post("/register/complete", {
        schema: {
          tags: ["Authentication"],
          summary: "Complete registration",
          description:
            "Completes the registration process with profile information using the temporary token from OTP verification.",
          body: CompleteRegistrationBodySchema,
          response: { 200: AuthResponseSchema },
        },
        config: {
          rateLimit: { max: 5, timeWindow: "5 minutes" },
        },
        handler: async (request, reply) => {
          const result = await authService.completeRegistration(
            request.body.token,
            request.body,
          );
          return reply.sendCreated({
            token: result.refreshToken,
            refreshToken: result.refreshToken,
            user: {
              id: result.id,
              name: result.name,
              email: result.email,
              role: result.role,
            },
          });
        },
      });
      app.post("/login", {
        schema: {
          tags: ["Authentication"],
          summary: "Customer login",
          description: "Authenticates a customer using phone and password.",
          body: LoginBodySchema,
          response: { 200: AuthResponseSchema },
        },
        config: {
          rateLimit: { max: 5, timeWindow: "15 minutes" },
        },
        handler: async (request, reply) => {
          const user = await authService.login(request.body);
          const token = fastify.jwt.sign({ sub: user.id });
          const refreshToken = await authService.createRefreshToken(user.id);

          return reply.sendOk({
            token,
            refreshToken,
            user: {
              id: user.id,
              name: user.name,
              email: user.email,
              role: user.role,
            },
          });
        },
      });

      app.post("/forgot-password", {
        schema: {
          tags: ["Authentication"],
          summary: "Forgot password - Send OTP",
          description:
            "Sends a password reset OTP to the provided phone number.",
          body: ForgotPasswordBodySchema,
        },
        config: {
          rateLimit: { max: 3, timeWindow: "5 minutes" },
        },
        handler: async (request, reply) => {
          await authService.forgotPassword(request.body.phone);
          return reply.sendOk(
            null,
            "If an account exists, a password reset OTP has been sent.",
          );
        },
      });

      app.post("/forgot-password/verify-otp", {
        schema: {
          tags: ["Authentication"],
          summary: "Forgot password - Verify OTP",
          description:
            "Verifies the password reset OTP and returns a reset token.",
          body: VerifyResetOtpBodySchema,
        },
        config: {
          rateLimit: { max: 5, timeWindow: "5 minutes" },
        },
        handler: async (request, reply) => {
          const resetToken = await authService.verifyResetOtp(
            request.body.phone,
            request.body.otp,
          );
          return reply.sendOk({ resetToken });
        },
      });

      app.post("/forgot-password/reset", {
        schema: {
          tags: ["Authentication"],
          summary: "Forgot password - Reset",
          description: "Resets the password using the reset token.",
          body: ResetPasswordWithTokenSchema,
        },
        config: {
          rateLimit: { max: 3, timeWindow: "5 minutes" },
        },
        handler: async (request, reply) => {
          await authService.resetPasswordWithToken(
            request.body.resetToken,
            request.body.newPassword,
          );
          return reply.sendOk(null, "Password has been reset successfully.");
        },
      });

      await instance.register(sharedAuthRoutes);
    },
    { prefix: "/auth" },
  );

  // ─── Admin Authentication ─────────────────────────────────────────────────
  fastify.register(
    async (instance) => {
      const app = instance.withTypeProvider<ZodTypeProvider>();

      app.post("/login", {
        schema: {
          tags: ["Authentication"],
          summary: "Admin login",
          description:
            "Authenticates an admin or operator using phone and password.",
          body: AdminLoginBodySchema,
          response: { 200: AuthResponseSchema },
        },
        config: {
          rateLimit: { max: 5, timeWindow: "15 minutes" },
        },
        handler: async (request, reply) => {
          const user = await authService.adminLogin(request.body);
          const token = fastify.jwt.sign({ sub: user.id });
          const refreshToken = await authService.createRefreshToken(user.id);

          return reply.sendOk({
            token,
            refreshToken,
            user: {
              id: user.id,
              name: user.name,
              email: user.email,
              role: user.role,
            },
          });
        },
      });

      await instance.register(sharedAuthRoutes);
    },
    { prefix: "/admin/auth" },
  );
};

export default authRoutes;
