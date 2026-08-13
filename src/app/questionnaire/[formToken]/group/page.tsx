import type { Metadata } from "next";
import { GroupRevealScreen } from "@/features/groupReveal/components/GroupRevealScreen";
import { formTokenSchema } from "@/features/questionnaire/schemas/questionnaire.contract.schema";
export const dynamic = "force-dynamic";
export const metadata: Metadata = { robots: { index: false, follow: false } };
export default async function Page({ params }: { params: Promise<{ formToken: string }> }) { const parsed = formTokenSchema.safeParse((await params).formToken); return parsed.success ? <GroupRevealScreen formToken={parsed.data} /> : <main><p role="status">This session link is invalid.</p></main>; }
