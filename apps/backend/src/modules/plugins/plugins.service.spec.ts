import { ConflictException, NotFoundException } from '@nestjs/common';
import { PLUGIN_ID as FORM_BUILDER_PLUGIN_ID } from '@unej-cms/plugin-form-builder';
import { PLUGIN_ID as PAGE_BUILDER_PLUGIN_ID } from '@unej-cms/plugin-page-builder';
import type { DrizzleDb } from '../../database/database.types';
import { forms, sitePlugins } from '../../database/schema';
import type { BuildProducer } from '../builder/queue/build.producer';
import { PluginsService } from './plugins.service';

function createService(db: object, enqueue = jest.fn().mockResolvedValue(undefined)) {
  const service = new PluginsService(
    db as unknown as DrizzleDb,
    { enqueue } as unknown as BuildProducer,
  );
  return { service, enqueue };
}

function createTransactionDb(installation: { isActive: boolean } | undefined) {
  const lock = jest
    .fn()
    .mockResolvedValue(installation ? [installation] : []);
  const select = jest.fn().mockReturnValue({
    from: jest.fn().mockReturnValue({
      where: jest.fn().mockReturnValue({
        limit: jest.fn().mockReturnValue({ for: lock }),
      }),
    }),
  });
  const deleteWhere = jest.fn().mockResolvedValue(undefined);
  const deleteFrom = jest.fn().mockReturnValue({ where: deleteWhere });
  const tx = { select, delete: deleteFrom };
  const transaction = jest.fn(
    async (callback: (transactionClient: typeof tx) => Promise<unknown>) =>
      callback(tx),
  );

  return { db: { transaction }, tx, transaction, deleteFrom };
}

describe('PluginsService', () => {
  it('reports a catalog plugin without a site row as not installed', async () => {
    const db = {
      select: jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([]),
        }),
      }),
    };
    const { service } = createService(db);

    const result = await service.listForSite('site-1');

    expect(result).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          slug: FORM_BUILDER_PLUGIN_ID,
          isInstalled: false,
          isActive: false,
        }),
      ]),
    );
  });

  it('does not create a row when deactivating a plugin that is not installed', async () => {
    const returning = jest.fn().mockResolvedValue([]);
    const db = {
      update: jest.fn().mockReturnValue({
        set: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({ returning }),
        }),
      }),
    };
    const { service, enqueue } = createService(db);

    await expect(
      service.deactivate('site-1', FORM_BUILDER_PLUGIN_ID, 'user-1'),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(db.update).toHaveBeenCalledWith(sitePlugins);
    expect(enqueue).not.toHaveBeenCalled();
  });

  it('rejects uninstall while the plugin is active', async () => {
    const { db, deleteFrom } = createTransactionDb({ isActive: true });
    const { service, enqueue } = createService(db);

    await expect(
      service.uninstall('site-1', FORM_BUILDER_PLUGIN_ID, 'user-1'),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(deleteFrom).not.toHaveBeenCalled();
    expect(enqueue).not.toHaveBeenCalled();
  });

  it('returns 404 when uninstalling a plugin without a site installation', async () => {
    const { db, deleteFrom } = createTransactionDb(undefined);
    const { service, enqueue } = createService(db);

    await expect(
      service.uninstall('site-1', FORM_BUILDER_PLUGIN_ID, 'user-1'),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(deleteFrom).not.toHaveBeenCalled();
    expect(enqueue).not.toHaveBeenCalled();
  });

  it('purges form-builder data and installation before enqueueing a rebuild', async () => {
    const events: string[] = [];
    const { db, tx, transaction, deleteFrom } = createTransactionDb({
      isActive: false,
    });
    transaction.mockImplementation(
      async (callback: (transactionClient: typeof tx) => Promise<unknown>) => {
        events.push('transaction:start');
        const result = await callback(tx);
        events.push('transaction:commit');
        return result;
      },
    );
    const enqueue = jest.fn().mockImplementation(async () => {
      events.push('enqueue');
    });
    const { service } = createService(db, enqueue);

    await expect(
      service.uninstall('site-1', FORM_BUILDER_PLUGIN_ID, 'user-1'),
    ).resolves.toEqual({ success: true });

    expect(deleteFrom).toHaveBeenNthCalledWith(1, forms);
    expect(deleteFrom).toHaveBeenNthCalledWith(2, sitePlugins);
    expect(events).toEqual([
      'transaction:start',
      'transaction:commit',
      'enqueue',
    ]);
    expect(enqueue).toHaveBeenCalledWith('site-1', 'user-1');
  });

  it('preserves authored content when uninstalling page-builder', async () => {
    const { db, deleteFrom } = createTransactionDb({ isActive: false });
    const { service, enqueue } = createService(db);

    await expect(
      service.uninstall('site-1', PAGE_BUILDER_PLUGIN_ID, 'user-1'),
    ).resolves.toEqual({ success: true });

    expect(deleteFrom).toHaveBeenCalledTimes(1);
    expect(deleteFrom).toHaveBeenCalledWith(sitePlugins);
    expect(enqueue).toHaveBeenCalledWith('site-1', 'user-1');
  });
});
