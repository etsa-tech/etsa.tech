import fs from "fs";
import { load } from "js-yaml";
import { getCarouselImages } from "@/lib/server-only-carousel";

jest.mock("fs");
jest.mock("js-yaml", () => ({ load: jest.fn() }));

const mockedFs = jest.mocked(fs);
const mockedLoad = jest.mocked(load);

describe("getCarouselImages", () => {
  afterEach(() => jest.resetAllMocks());

  it("maps image files to metadata, sorted, ignoring non-images", () => {
    mockedFs.readdirSync.mockReturnValue([
      "b.png",
      "a.jpg",
      "notes.txt",
    ] as never);
    mockedFs.readFileSync.mockReturnValue("yaml" as never);
    mockedLoad.mockReturnValue({
      images: { "a.jpg": { alt: "A", caption: "First" } },
      default: { alt: "default alt", caption: "default caption" },
    });

    const images = getCarouselImages();
    expect(images).toEqual([
      { src: "/images/carousel/a.jpg", alt: "A", caption: "First" },
      {
        src: "/images/carousel/b.png",
        alt: "default alt",
        caption: "default caption",
      },
    ]);
  });

  it("falls back to default metadata when the YAML file can't be read", () => {
    mockedFs.readdirSync.mockReturnValue(["a.jpg"] as never);
    mockedFs.readFileSync.mockImplementation(() => {
      throw new Error("ENOENT");
    });

    const images = getCarouselImages();
    expect(images).toEqual([
      {
        src: "/images/carousel/a.jpg",
        alt: "ETSA community event",
        caption: "Building connections in the tech community",
      },
    ]);
  });

  it("returns an empty array when the directory can't be read", () => {
    mockedFs.readdirSync.mockImplementation(() => {
      throw new Error("ENOENT");
    });
    expect(getCarouselImages()).toEqual([]);
  });
});
