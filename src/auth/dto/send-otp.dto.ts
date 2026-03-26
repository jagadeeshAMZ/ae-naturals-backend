import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsEnum } from 'class-validator';

export class SendOtpDto {
  @ApiProperty({
    description: 'The email address or phone number of the user',
    example: 'user@example.com',
  })
  @IsString()
  @IsNotEmpty()
  identifier: string;

  @ApiProperty({
    description: 'The method to send the OTP',
    enum: ['phone', 'email'],
    example: 'email',
  })
  @IsEnum(['phone', 'email'])
  @IsNotEmpty()
  type: 'phone' | 'email';
}