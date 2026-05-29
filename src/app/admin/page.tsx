import { redirect } from "next/navigation";

import { requireAuth } from "@/lib/auth-utils";
import db from "@/lib/db";

const Page = async () => {
  const session = await requireAuth();

  const membership = await db.organizationMember.findFirst({
    where: { userId: session.user.id },
    select: { organizationId: true },
  });

  if (membership?.organizationId) {
    redirect(`/admin/${membership.organizationId}`);
  } else {
    redirect("/login");
  }
};

export default Page;
