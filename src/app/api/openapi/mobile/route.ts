import { promises as fs } from "fs";
import path from "path";
import { NextResponse, type NextRequest } from "next/server";
import { getAppOrigin } from "@/lib/utils/app-origin";

const MOBILE_SPEC_PATH = path.join(process.cwd(), "docs", "mobile-app.openapi.yaml");

const injectOriginIntoServers = (yaml: string, origin: string) =>
  yaml.replace(
    /servers:\s*\n\s*-\s*url:\s*\/\s*/,
    `servers:\n  - url: ${origin}\n`,
  );

export async function GET(request: NextRequest) {
  try {
    const rawSpec = await fs.readFile(MOBILE_SPEC_PATH, "utf8");
    const origin = getAppOrigin(request);
    const spec = injectOriginIntoServers(rawSpec, origin);

    return new NextResponse(spec, {
      headers: {
        "Content-Type": "application/yaml; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Mobile OpenAPI document is unavailable",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
