import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, Length } from 'class-validator';

export class VerifyOtpDto {
  @ApiProperty({
    description: 'The email address or phone number of the user',
    example: 'user@example.com',
  })
  @IsString()
  @IsNotEmpty()
  identifier: string;

  @ApiProperty({
    description: 'The 6-digit OTP received by the user',
    example: '123456',
  })
  @IsString()
  @IsNotEmpty()
  @Length(6, 6)
  otp: string;
}