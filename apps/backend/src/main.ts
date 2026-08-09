import { NestFactory } from '@nestjs/core';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { ADMIN_JSON_BODY_LIMIT } from './common/content-limits';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useBodyParser('json', { limit: ADMIN_JSON_BODY_LIMIT });
  app.use(helmet());
  app.use(cookieParser());
  // The dashboard talks to this API server-side (BFF pattern, see
  // src/lib/server/api/client.ts in apps/dashboard) so it never needs CORS.
  // The one exception: a visitor's browser on the *public static site*
  // (a different origin) submits forms directly — scoped to that single
  // route only, not enabled globally, so session-cookie-protected admin
  // endpoints stay same-origin-only.
  app.use(
    '/sites/:siteId/forms/:formId/submit',
    cors({ origin: true, methods: ['POST'] }),
  );
  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
