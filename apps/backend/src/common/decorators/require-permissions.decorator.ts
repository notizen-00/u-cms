import { SetMetadata } from '@nestjs/common';

export const REQUIRED_PERMISSIONS = 'required_permissions';

export type CmsPermission =
  | 'content:read'
  | 'content:create'
  | 'content:update'
  | 'content:delete'
  | 'content:review'
  | 'content:publish'
  | 'content:schedule'
  | 'content:archive'
  | 'site:manage'
  | 'members:manage';

export const RequirePermissions = (...permissions: CmsPermission[]) =>
  SetMetadata(REQUIRED_PERMISSIONS, permissions);