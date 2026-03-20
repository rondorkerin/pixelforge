import sharp from 'sharp';

/**
 * Downscale an image using nearest-neighbor interpolation.
 * This is critical for pixel art -- bicubic/lanczos would blur the pixels.
 */
export async function downscale(
  inputPath: string,
  outputPath: string,
  targetWidth: number,
  targetHeight: number
): Promise<void> {
  await sharp(inputPath)
    .resize(targetWidth, targetHeight, {
      kernel: sharp.kernel.nearest,
      fit: 'fill',
    })
    .png()
    .toFile(outputPath);
}
