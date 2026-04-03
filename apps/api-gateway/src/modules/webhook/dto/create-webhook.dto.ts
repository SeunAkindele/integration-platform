import { IsNotEmpty, IsString } from "class-validator";

export class WebhookProviderParamDto {
  @IsString()
  @IsNotEmpty()
  provider!: string;
}