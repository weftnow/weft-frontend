import type { Metadata } from "next";
import { FormTokenConversation } from "@/features/conversation/components/FormTokenConversation";
import { formTokenSchema } from "@/features/questionnaire/schemas/questionnaire.contract.schema";
export const dynamic = "force-dynamic";
export const metadata: Metadata = { robots: { index: false, follow: false } };
export default async function Page({ params }: { params: Promise<{ formToken: string }> }) { const parsed = formTokenSchema.safeParse((await params).formToken); return parsed.success ? <FormTokenConversation formToken={parsed.data} /> : <main><p role="status">This session link is invalid.</p></main>; }
