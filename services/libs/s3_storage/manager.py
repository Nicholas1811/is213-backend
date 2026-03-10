import boto3
import uuid
from botocore.exceptions import ClientError

class S3StorageLib:
    def __init__(self, bucket_name, region="ap-southeast-1", access_key=None, secret_key=None):
        self.bucket_name = bucket_name
        self.region = region
        self.s3_client = boto3.client(
            's3',
            region_name=region,
            aws_access_key_id=access_key,
            aws_secret_access_key=secret_key
        )

    def get_upload_bundle(self, extension="jpg", max_size_mb=5):
        file_key = f"uploads/{uuid.uuid4()}.{extension}"
        max_size_bytes = max_size_mb * 1024 * 1024

        try:
            presigned_post = self.s3_client.generate_presigned_post(
                Bucket=self.bucket_name,
                Key=file_key,
                Fields={"acl": "public-read", "Content-Type": f"image/{extension}"},
                Conditions=[
                    {"Content-Type": f"image/{extension}"},
                    ["content-length-range", 1, max_size_bytes]
                ],
                ExpiresIn=3600
            )
            
            #for DB storage
            source_url = f"https://{self.bucket_name}.s3.{self.region}.amazonaws.com/{file_key}"
            
            return {
                "presigned": presigned_post,
                #If successful in uploading the below will become valid
                "source_url": source_url,
                "file_key": file_key
            }
        except ClientError as e:
            return {"error": str(e)}

    def verify_upload(self, file_key):
        try:
            self.s3_client.head_object(Bucket=self.bucket_name, Key=file_key)
            return True
        except ClientError:
            return False
        



