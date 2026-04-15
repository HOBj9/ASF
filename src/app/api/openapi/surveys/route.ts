import { promises as fs } from "fs";
import path from "path";
import { NextResponse, type NextRequest } from "next/server";
import { getAppOrigin } from "@/lib/utils/app-origin";

const SURVEYS_SPEC_PATH = path.join(process.cwd(), "docs", "surveys.openapi.yaml");

const injectOriginIntoServers = (yaml: string, origin: string) =>
  yaml.replace(
    /servers:\s*\n\s*-\s*url:\s*\/\s*\n\s*description:\s*Same host as the Next\.js application/,
    `servers:\n  - url: ${origin}\n    description: Current application origin`
  );

export async function GET(request: NextRequest) {
  try {
    const rawSpec = await fs.readFile(SURVEYS_SPEC_PATH, "utf8");
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
        error: "Surveys OpenAPI document is unavailable",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
