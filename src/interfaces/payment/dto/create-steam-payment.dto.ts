import { IsString, IsEmail, IsNumber, Min, Max } from 'class-validator';

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
  @Min(5, { message: 'Amount must be between 5 and 100000' })
  @Max(100000, { message: 'Amount must be between 5 and 100000' })
  amount: number;
}
