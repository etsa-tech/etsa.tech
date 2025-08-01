// Server-only carousel utilities
import "server-only";
import fs from "fs";
import path from "path";
import yaml from "js-yaml";

// Interface for carousel metadata schema
interface CarouselMetadata {
  images: Record<string, { alt: string; caption: string }>;
  default: { alt: string; caption: string };
}

// Get carousel images dynamically from the public/images/carousel directory
export function getCarouselImages(): Array<{
  src: string;
  alt: string;
  caption: string;
}> {
  try {
    const carouselDir = path.join(process.cwd(), "public/images/carousel");
    const metadataPath = path.join(
      process.cwd(),
      "public/carousel-metadata.yaml",
    );

    // Read image files
    const files = fs.readdirSync(carouselDir);
    const imageFiles = files
      .filter((file: string) => /\.(jpg|jpeg|png|gif|webp)$/i.test(file))
      .sort();

    // Read metadata from YAML file
    let metadata: CarouselMetadata;
    try {
      const yamlContent = fs.readFileSync(metadataPath, "utf8");
      metadata = yaml.load(yamlContent) as CarouselMetadata;
    } catch (yamlError) {
      console.warn(
        "Could not read carousel metadata YAML, using defaults:",
        yamlError,
      );
      metadata = {
        images: {},
        default: {
          alt: "ETSA community event",
          caption: "Building connections in the tech community",
        },
      };
    }

    return imageFiles.map((filename: string) => {
      const imageMetadata = metadata.images[filename] || metadata.default;

      return {
        src: `/images/carousel/${filename}`,
        alt: imageMetadata.alt,
        caption: imageMetadata.caption,
      };
    });
  } catch (error) {
    console.error("Error reading carousel images:", error);
    // Fallback to empty array if directory doesn't exist or can't be read
    return [];
  }
}
