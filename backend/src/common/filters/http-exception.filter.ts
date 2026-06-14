import {
  ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus, Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();

    const { status, message, error } = this.resolve(exception);

    if (status >= 500) {
      this.logger.error(
        `${req.method} ${req.url} → ${status}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    } else {
      this.logger.warn(`${req.method} ${req.url} → ${status}: ${message}`);
    }

    res.status(status).json({ success: false, statusCode: status, message, error });
  }

  private resolve(exception: unknown): { status: number; message: string; error: string } {
    // NestJS HTTP exceptions (including ValidationPipe errors)
    if (exception instanceof HttpException) {
      const status   = exception.getStatus();
      const response = exception.getResponse();

      if (typeof response === 'string') {
        return { status, message: response, error: exception.name };
      }

      if (typeof response === 'object' && response !== null) {
        const r = response as Record<string, any>;
        // class-validator sends message as string[]
        const raw = r['message'];
        const message = Array.isArray(raw) ? raw[0] : (raw ?? exception.message);
        return { status, message: this.humanize(message), error: r['error'] ?? exception.name };
      }
    }

    // Prisma errors
    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      return this.handlePrismaError(exception);
    }

    if (exception instanceof Prisma.PrismaClientValidationError) {
      return { status: 400, message: 'Invalid data provided.', error: 'Bad Request' };
    }

    if (exception instanceof Prisma.PrismaClientInitializationError) {
      return { status: 503, message: 'Database is unavailable. Try again shortly.', error: 'Service Unavailable' };
    }

    // Unknown / unhandled
    return { status: HttpStatus.INTERNAL_SERVER_ERROR, message: 'Something went wrong.', error: 'Internal Server Error' };
  }

  private handlePrismaError(err: Prisma.PrismaClientKnownRequestError): { status: number; message: string; error: string } {
    switch (err.code) {
      case 'P2002': {
        const field = (err.meta?.target as string[] | undefined)?.[0] ?? 'field';
        return { status: 409, message: `This ${field} is already in use.`, error: 'Conflict' };
      }
      case 'P2025':
        return { status: 404, message: 'Record not found.', error: 'Not Found' };
      case 'P2003':
        return { status: 400, message: 'Related record does not exist.', error: 'Bad Request' };
      case 'P2014':
        return { status: 400, message: 'This action would violate a data constraint.', error: 'Bad Request' };
      default:
        return { status: 500, message: 'A database error occurred.', error: 'Database Error' };
    }
  }

  private humanize(msg: string): string {
    if (!msg) return 'Something went wrong.';
    const s = String(msg).charAt(0).toUpperCase() + String(msg).slice(1);
    return s.endsWith('.') ? s : s + '.';
  }
}
