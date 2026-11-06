import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  escapeLike,
  RANGE_DAYS,
  listInstruments,
  findBySymbol,
  getHistory,
  createInstrumentRepository,
} from './instrument.repository.js';

describe('instrument.repository', () => {
  describe('escapeLike', () => {
    it('escapes %, _, and \\ characters properly', () => {
      assert.equal(escapeLike('normal'), 'normal');
      assert.equal(escapeLike('50% off'), '50\\% off');
      assert.equal(escapeLike('user_name'), 'user\\_name');
      assert.equal(escapeLike('path\\to\\file'), 'path\\\\to\\\\file');
      assert.equal(escapeLike('%_\\'), '\\%\\_\\\\');
      assert.equal(escapeLike(null), '');
      assert.equal(escapeLike(123), '');
    });
  });

  describe('listInstruments', () => {
    it('asserts SQL text contains no "SELECT *" and search is passed as parameter', async () => {
      let executedSql = '';
      let executedParams = [];

      const fakeQuery = async (sql, params) => {
        executedSql = sql;
        executedParams = params;
        return {
          rows: [
            {
              id: 1,
              symbol: 'RELIANCE',
              name: 'Reliance Industries Ltd',
              sector: 'Energy',
              latest_close: '2750.50',
              latest_trade_date: '2026-10-26',
              previous_close: '2740.00',
            },
          ],
        };
      };

      const result = await listInstruments({ search: 'rel%_test', limit: 20, offset: 0 }, fakeQuery);

      // Verify no SELECT *
      assert.equal(executedSql.includes('SELECT *'), false, 'SQL must not contain SELECT *');
      assert.match(executedSql, /SELECT\s+i\.id,\s+i\.symbol/i);

      // Verify search is parameterized and escaped, not string-interpolated
      assert.equal(executedSql.includes('rel%_test'), false, 'Search term must not be interpolated directly into SQL text');
      assert.equal(executedParams[0], '%rel\\%\\_test%');
      assert.equal(executedParams[1], 20); // limit
      assert.equal(executedParams[2], 0);  // offset

      // Verify results keep close values as strings
      assert.equal(result.length, 1);
      assert.equal(result[0].symbol, 'RELIANCE');
      assert.equal(typeof result[0].latestClose, 'string');
      assert.equal(result[0].latestClose, '2750.50');
      assert.equal(typeof result[0].previousClose, 'string');
      assert.equal(result[0].previousClose, '2740.00');
    });

    it('passes null as search parameter when search is omitted or empty', async () => {
      let executedParams = [];
      const fakeQuery = async (sql, params) => {
        executedParams = params;
        return { rows: [] };
      };

      await listInstruments({}, fakeQuery);
      assert.equal(executedParams[0], null);

      await listInstruments({ search: '   ' }, fakeQuery);
      assert.equal(executedParams[0], null);
    });
  });

  describe('findBySymbol', () => {
    it('asserts SQL text contains no "SELECT *" and passes symbol as parameter', async () => {
      let executedSql = '';
      let executedParams = [];

      const fakeQuery = async (sql, params) => {
        executedSql = sql;
        executedParams = params;
        return {
          rows: [
            {
              id: '2',
              symbol: 'TCS',
              name: 'Tata Consultancy Services Ltd',
              sector: 'Technology',
              latest_close: '3850.00',
              latest_trade_date: '2026-10-26',
              previous_close: '3820.50',
            },
          ],
        };
      };

      const result = await findBySymbol('tcs', fakeQuery);

      assert.equal(executedSql.includes('SELECT *'), false, 'SQL must not contain SELECT *');
      assert.equal(executedParams[0], 'tcs');

      assert.equal(result.symbol, 'TCS');
      assert.equal(typeof result.latestClose, 'string');
      assert.equal(result.latestClose, '3850.00');
      assert.equal(typeof result.previousClose, 'string');
      assert.equal(result.previousClose, '3820.50');
    });

    it('returns null when symbol is empty or not found', async () => {
      const fakeQuery = async () => ({ rows: [] });

      assert.equal(await findBySymbol('', fakeQuery), null);
      assert.equal(await findBySymbol(null, fakeQuery), null);
      assert.equal(await findBySymbol('NONEXISTENT', fakeQuery), null);
    });
  });

  describe('getHistory', () => {
    it('asserts SQL contains no "SELECT *", maps ranges correctly, and preserves close as strings', async () => {
      let executedSql = '';
      let executedParams = [];

      const fakeQuery = async (sql, params) => {
        executedSql = sql;
        executedParams = params;
        return {
          rows: [
            { date: '2026-09-27', close: '1720.00' },
            { date: '2026-10-26', close: '1750.25' },
          ],
        };
      };

      const rangesToTest = [
        { range: '1M', expectedDays: 30 },
        { range: '3M', expectedDays: 90 },
        { range: '6M', expectedDays: 183 },
        { range: '1Y', expectedDays: 365 },
      ];

      for (const { range, expectedDays } of rangesToTest) {
        const history = await getHistory('INFY', range, fakeQuery);

        assert.equal(executedSql.includes('SELECT *'), false, 'SQL must not contain SELECT *');
        assert.equal(executedParams[0], 'INFY');
        assert.equal(executedParams[1], expectedDays);

        assert.equal(history.length, 2);
        assert.equal(typeof history[0].close, 'string');
        assert.equal(history[0].close, '1720.00');
        assert.equal(typeof history[1].close, 'string');
        assert.equal(history[1].close, '1750.25');
      }
    });

    it('throws on unsupported range parameter', async () => {
      const fakeQuery = async () => ({ rows: [] });

      await assert.rejects(
        () => getHistory('INFY', '2Y', fakeQuery),
        /Invalid range: 2Y/
      );
      await assert.rejects(
        () => getHistory('INFY', 'INVALID', fakeQuery),
        /Invalid range: INVALID/
      );
    });

    it('returns empty array when symbol is missing', async () => {
      const fakeQuery = async () => ({ rows: [] });
      const res = await getHistory('', '1M', fakeQuery);
      assert.deepEqual(res, []);
    });
  });

  describe('createInstrumentRepository', () => {
    it('allows query function injection across all methods', async () => {
      let queryCalls = 0;
      const fakeQuery = async () => {
        queryCalls++;
        return { rows: [] };
      };

      const repo = createInstrumentRepository(fakeQuery);

      await repo.listInstruments();
      assert.equal(queryCalls, 1);

      await repo.findBySymbol('SBIN');
      assert.equal(queryCalls, 2);

      await repo.getHistory('SBIN', '1M');
      assert.equal(queryCalls, 3);
    });
  });
});
