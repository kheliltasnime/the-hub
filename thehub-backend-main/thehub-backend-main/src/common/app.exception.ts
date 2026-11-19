import { HttpException } from '@nestjs/common';

export class AppException extends HttpException {
  public readonly code: string;

  constructor(code: string, message: string, statusCode: number) {
    super({ code, message, statusCode }, statusCode);
    this.code = code;
  }
}