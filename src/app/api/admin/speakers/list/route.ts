import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { isAuthorizedUser } from "@/lib/auth-utils";
import fs from "fs";
import path from "path";

// Force dynamic rendering - this is a serverless function
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!isAuthorizedUser(session)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Read from local file system
    const speakersDir = path.join(
      process.cwd(),
      "public",
      "images",
      "speakers",
    );

    try {
      // Check if directory exists
      if (!fs.existsSync(speakersDir)) {
        return NextResponse.json({
          success: true,
          images: [],
          message:
            "Speaker images directory doesn't exist yet. Upload your first speaker image to create it.",
        });
      }

      // Read directory contents
      const files = fs.readdirSync(speakersDir);

      // Filter for image files only
      const imageExtensions = [".jpg", ".jpeg", ".png", ".webp"];
      const speakerImages = files
        .filter((file) => {
          const extension = path.extname(file).toLowerCase();
          return imageExtensions.includes(extension);
        })
        .map((file) => {
          const filePath = path.join(speakersDir, file);
          const stats = fs.statSync(filePath);

          return {
            name: file,
            url: `/images/speakers/${file}`,
            size: stats.size,
            modified: stats.mtime.toISOString(),
          };
        })
        .sort((a, b) => a.name.localeCompare(b.name));

      return NextResponse.json({
        success: true,
        images: speakerImages,
        count: speakerImages.length,
      });
    } catch (error) {
      console.error("Error reading speaker images directory:", error);
      return NextResponse.json({
        success: true,
        images: [],
        error: "Failed to read speaker images directory",
      });
    }
  } catch (error) {
    console.error("Error listing speaker images:", error);
    return NextResponse.json(
      { error: "Failed to list speaker images" },
      { status: 500 },
    );
  }
}
