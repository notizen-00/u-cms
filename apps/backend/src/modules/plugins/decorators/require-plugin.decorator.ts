import { SetMetadata } from '@nestjs/common';

export const REQUIRE_PLUGIN_KEY = 'requirePlugin';

export const RequirePlugin = (slug: string) =>
  SetMetadata(REQUIRE_PLUGIN_KEY, slug);
