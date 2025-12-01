import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { S3Client } from '@aws-sdk/client-s3';
import multerS3 from 'multer-s3';

@Module({
  imports: [
    MulterModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const isProduction = configService.get('NODE_ENV') === 'production';
        
        if (isProduction) {
          const s3 = new S3Client({
            region: configService.get('AWS_S3_REGION') as string,
            credentials: {
              accessKeyId: configService.get('AWS_ACCESS_KEY_ID') as string,
              secretAccessKey: configService.get('AWS_SECRET_ACCESS_KEY') as string,
            },
          });

          return {
            storage: multerS3({
              s3: s3,
              bucket: configService.get('AWS_S3_BUCKET') as string,
              acl: configService.get('AWS_S3_ACL'),
              key: (req, file, cb) => {
                cb(null, `${Date.now().toString()}-${file.originalname}`);
              },
            }),
          };
        } else {
          // Use local storage in development
          return {
            dest: './uploads',
          };
        }
      },
    }),
  ],
  exports: [MulterModule],
})
export class FileUploadModule {}
