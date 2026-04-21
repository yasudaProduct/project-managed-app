import { NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import path from "node:path";

const DOC_ID_PATTERN = /^[a-z0-9-]+$/;
const DOCS_DIR = path.join(process.cwd(), "docs", "help");

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  if (!DOC_ID_PATTERN.test(id)) {
    return NextResponse.json({ error: "Invalid doc id" }, { status: 400 });
  }

  const filePath = path.join(DOCS_DIR, `${id}.md`);

  try {
    const content = await readFile(filePath, "utf-8");
    return new NextResponse(content, {
      status: 200,
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        "Cache-Control": "public, max-age=300",
      },
    });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return NextResponse.json({ error: "Doc not found" }, { status: 404 });
    }
    return NextResponse.json(
      { error: "Failed to read doc" },
      { status: 500 }
    );
  }
}
