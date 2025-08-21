export interface R2Config {
  bucketRegion: string;
  accountId: string;
  bucketAccessKey: string;
  bucketSecretKey: string;
  bucketName: string;
}

export interface FileUploadResponse {
  Key: string;
}

export interface FileExistsResponse {
  key: string;
  exists: boolean;
}
