import os
import boto3

def _client():
    return boto3.client(
        "s3",
        endpoint_url=f"https://{os.environ['R2_ACCOUNT_ID']}.r2.cloudflarestorage.com",
        aws_access_key_id=os.environ["R2_ACCESS_KEY_ID"],
        aws_secret_access_key=os.environ["R2_SECRET_ACCESS_KEY"],
        region_name="auto",
    )

async def upload_audio(track_id: str, data: bytes):
    _client().put_object(Bucket=os.environ["R2_BUCKET"], Key=f"audio/{track_id}.mp3", Body=data, ContentType="audio/mpeg")

async def upload_thumbnail(track_id: str, data: bytes):
    _client().put_object(Bucket=os.environ["R2_BUCKET"], Key=f"thumbnails/{track_id}.jpg", Body=data, ContentType="image/jpeg")
