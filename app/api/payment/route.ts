import { NextResponse } from "next/server";
import { listPacks, stripeEnabled } from "@/lib/packs";

export const runtime = "nodejs";

/** Lists the available credit packs and whether real payments are enabled. */
export async function GET() {
  return NextResponse.json({
    stripe: stripeEnabled(),
    packs: listPacks(),
  });
}
