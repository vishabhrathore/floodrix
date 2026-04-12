import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import prisma from "@/lib/db";

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  emailAndPassword: {
    enabled: true,
    autoSignIn: true,
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
    },
  },
  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          // Create a personal organization for the new user
          const org = await prisma.organization.create({
            data: {
              name: `${user.name || user.email.split('@')[0]}'s Organization`,
              founderId: user.id,
              isPersonal: true,
            },
          });

          // Add the user as an OWNER of their organization
          await prisma.organizationMember.create({
            data: {
              userId: user.id,
              organizationId: org.id,
              role: "OWNER",
            },
          });

          // Create a CalcActor for the user in their organization
          await prisma.calcActor.create({
            data: {
              userId: user.id,
              organizationId: org.id,
              displayName: user.name || user.email.split('@')[0],
            },
          });
        },
      },
    },
  },
  plugins: [] // Polar disabled for now
});
