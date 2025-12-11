/**
 * Account Page
 * 
 * User account settings including:
 * - Profile (name, avatar)
 * - Password change (for credentials users)
 * - Payment details (PayPal, Bank, Wise)
 */

import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ProfileSection } from "./_components/profile-section";
import { PasswordSection } from "./_components/password-section";
import { PaymentSection } from "./_components/payment-section";

export default async function AccountPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  // Fetch user data with payment details
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      paymentDetails: true,
      accounts: {
        select: { provider: true },
      },
    },
  });

  if (!user) {
    redirect("/login");
  }

  // Check if user has password (credentials login)
  const hasPassword = !!user.password;
  
  // Check if user uses OAuth
  const oauthProviders = user.accounts.map((a) => a.provider);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Account Settings</h1>
        <p className="text-muted-foreground">
          Manage your profile, security, and payment details.
        </p>
      </div>

      <div className="grid gap-6">
        {/* Profile Section */}
        <ProfileSection
          user={{
            id: user.id,
            name: user.name || "",
            email: user.email,
            image: user.image || "",
          }}
          oauthProviders={oauthProviders}
        />

        {/* Password Section - Only for credentials users */}
        <PasswordSection
          hasPassword={hasPassword}
          oauthProviders={oauthProviders}
        />

        {/* Payment Details Section */}
        <PaymentSection
          paymentDetails={user.paymentDetails}
          userId={user.id}
        />
      </div>
    </div>
  );
}

