import { IsString, IsEmail, IsNumber, Min } from 'class-validator';

export class CreateSteamPaymentDto {
  @IsString()
  nickname: string;

  @IsString()
  name: string;

  @IsString()
  tgUserName: string;

  @IsEmail()
  email: string;

  @IsNumber()
  @Min(1)
  amount: number;
}
