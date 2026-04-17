import { S3Client, DeleteObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

function client() {
  return new S3Client({
    region: "auto",
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID!,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    },
  });
}

export function buildR2Key(kind: "audio" | "thumbnail", id: string): string {
  return kind === "audio" ? `audio/${id}.mp3` : `thumbnails/${id}.jpg`;
}

export async function presignUrl(key: string, expiresSec: number): Promise<string> {
  const cmd = new GetObjectCommand({ Bucket: process.env.R2_BUCKET!, Key: key });
  return getSignedUrl(client(), cmd, { expiresIn: expiresSec });
}

export async function deleteObject(key: string): Promise<void> {
  const cmd = new DeleteObjectCommand({ Bucket: process.env.R2_BUCKET!, Key: key });
  await client().send(cmd);
}
