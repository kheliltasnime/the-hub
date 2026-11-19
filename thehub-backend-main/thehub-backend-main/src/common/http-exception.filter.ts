import {
  ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { ThrottlerException } from '@nestjs/throttler';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
    let code = 'INTERNAL_ERROR';
    let message = 'Une erreur inattendue est survenue';

    if (exception instanceof ThrottlerException) {
      statusCode = HttpStatus.TOO_MANY_REQUESTS;
      code = 'TOO_MANY_REQUESTS';
      message = 'Trop de requetes, veuillez reessayer dans quelques instants';
    } else if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      const body = exception.getResponse();
      if (typeof body === 'object' && body !== null && 'code' in body) {
        code = (body as any).code;
        message = (body as any).message;
      } else if (typeof body === 'object' && body !== null && 'message' in body) {
        code = 'VALIDATION_ERROR';
        const rawMessage = (body as any).message;
        message = Array.isArray(rawMessage) ? rawMessage.join(', ') : rawMessage;
      } else {
        message = exception.message;
      }
    }

    // Log systématique de toute erreur non prévue (500) — sinon elle est invisible
    if (statusCode === HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(
        `${(exception as Error)?.message ?? exception}`,
        (exception as Error)?.stack,
      );
    }

    response.status(statusCode).json({ error: { code, message, statusCode } });
  }
}