import { describe, it, expect } from 'vitest';
import { parseIbkrDividendCsv } from '../src/lib/import/parseIbkrCsv';

/** Synthetic IBKR dividend CSV for tests only. Same structure as real export; no real tickers or amounts. */
const SAMPLE_CSV = `Account,Header,AccountNumber,AccountAlias,Name,BaseCurrency,
Account,Data,TEST_ACCOUNT,,Test Holder,EUR,
DividendDetail,Header,DataDiscriminator,Currency,Symbol,Conid,Country,ReportDate,ExDate,Shares,RevenueComponent,QualifiedIndicator,Gross,GrossInBase,GrossInUSD,Withhold,WithholdInBase,WithholdInUSD
DividendDetail,Data,Summary,EUR,TST1,10001,FR,20241204,20241202,100,,,100,100,105,-25,-25,-26.25,
DividendDetail,Data,RevenueComponent,EUR,TST1,10001,FR,20241204,20241202,,Ordinary Dividend,Qualified - Meets Holding Period,100,100,105,-25,-25,-26.25,
DividendDetail,Total,,EUR,,,,,,,,,100,100,105,-25,-25,-26.25,
DividendDetail,Data,Summary,USD,TST2,10002,US,20241023,20241002,50,,,50,50,50,-7.5,-7.5,-7.5,
DividendDetail,Data,RevenueComponent,USD,TST2,10002,US,20241023,20241002,,Ordinary Dividend,Qualified - Meets Holding Period,50,50,50,-7.5,-7.5,-7.5,
DividendDetail,Data,Summary,USD,TST3,10003,US,20240617,20240610,10,,,10,10,10,-1.5,-1.5,-1.5,
DividendDetail,Data,RevenueComponent,USD,TST3,10003,US,20240617,20240610,,Ordinary Dividend,Qualified - Meets Holding Period,10,10,10,-1.5,-1.5,-1.5,
DividendDetail,Data,Summary,USD,TST3,10003,US,20240916,20240909,10,,,10,10,10,-1.5,-1.5,-1.5,
DividendDetail,Data,RevenueComponent,USD,TST3,10003,US,20240916,20240909,,Ordinary Dividend,Qualified - Meets Holding Period,10,10,10,-1.5,-1.5,-1.5,
DividendDetail,Data,Summary,USD,TST3,10003,US,20241216,20241209,10,,,10,10,10,-1.5,-1.5,-1.5,
DividendDetail,Data,RevenueComponent,USD,TST3,10003,US,20241216,20241209,,Ordinary Dividend,Qualified - Meets Holding Period,10,10,10,-1.5,-1.5,-1.5,
DividendDetail,Data,Summary,USD,TST4,10004,US,20240314,20240229,5,,,5,5,5,-0.75,-0.75,-0.75,
DividendDetail,Data,RevenueComponent,USD,TST4,10004,US,20240314,20240229,,Ordinary Dividend,Qualified - Meets Holding Period,5,5,5,-0.75,-0.75,-0.75,
DividendDetail,Data,RevenueComponent,USD,TST4,10004,US,20240314,20240229,,Other,Other,0,0,0,-0.01,-0.01,-0.01,
DividendDetail,Total,,USD,,,,,,,,,75,75,75,-11.25,-11.25,-11.25,
DividendRevenueSummary,Header,RevenueType,TotalInBase,TotalInUSD
DividendRevenueSummary,Data,Total Ordinary Dividends,175,180,
DividendSummaryByCountry,Header,CountryCode,Country,TotalDividendsInBase,TotalPILReceivedInBase,TotalTaxWithholdingInBase
DividendSummaryByCountry,Data,FR,FRANCE,100,0,25,
DividendSummaryByCountry,Data,US,UNITED STATES,75,0,11.25,
DividendSummaryByCountry,Total,,,175,0,36.25,
`;

describe('parseIbkrDividendCsv', () => {
  it('parses sample IBKR dividend CSV into aggregated entries', () => {
    const entries = parseIbkrDividendCsv(SAMPLE_CSV);
    expect(entries).toHaveLength(4); // TST1, TST2, TST3, TST4
  });

  it('produces one entry per ticker/country/currency with correct amounts', () => {
    const entries = parseIbkrDividendCsv(SAMPLE_CSV);
    const byTicker = Object.fromEntries(entries.map((e) => [e.ticker, e]));

    // TST1: FR, EUR — single Summary row
    expect(byTicker.TST1).toBeDefined();
    expect(byTicker.TST1!.country).toBe('250');
    expect(byTicker.TST1!.countryName).toBe('Francúzsko');
    expect(byTicker.TST1!.currency).toBe('EUR');
    expect(byTicker.TST1!.amountOriginal).toBe('100.00');
    expect(byTicker.TST1!.amountEur).toBe('100.00');
    expect(byTicker.TST1!.withheldTaxOriginal).toBe('25.00');
    expect(byTicker.TST1!.withheldTaxEur).toBe('25.00');

    // TST2: US, USD
    expect(byTicker.TST2).toBeDefined();
    expect(byTicker.TST2!.country).toBe('840');
    expect(byTicker.TST2!.currency).toBe('USD');
    expect(byTicker.TST2!.amountOriginal).toBe('50.00');
    expect(byTicker.TST2!.amountEur).toBe('50.00');
    expect(byTicker.TST2!.withheldTaxOriginal).toBe('7.50');
    expect(byTicker.TST2!.withheldTaxEur).toBe('7.50');

    // TST3: US, USD — three Summary rows aggregated
    expect(byTicker.TST3).toBeDefined();
    expect(byTicker.TST3!.country).toBe('840');
    expect(byTicker.TST3!.amountOriginal).toBe('30.00'); // 10 + 10 + 10
    expect(byTicker.TST3!.amountEur).toBe('30.00');
    expect(byTicker.TST3!.withheldTaxOriginal).toBe('4.50'); // 1.5 + 1.5 + 1.5
    expect(byTicker.TST3!.withheldTaxEur).toBe('4.50');

    // TST4: US, USD
    expect(byTicker.TST4).toBeDefined();
    expect(byTicker.TST4!.country).toBe('840');
    expect(byTicker.TST4!.amountOriginal).toBe('5.00');
    expect(byTicker.TST4!.withheldTaxOriginal).toBe('0.75');
  });

  it('assigns unique ids to each entry', () => {
    const entries = parseIbkrDividendCsv(SAMPLE_CSV);
    const ids = new Set(entries.map((e) => e.id));
    expect(ids.size).toBe(entries.length);
    entries.forEach((e) => {
      expect(e.id).toMatch(/^[0-9a-f-]{36}$/i);
    });
  });

  it('ignores non-Summary rows', () => {
    const onlyHeader =
      'DividendDetail,Header,DataDiscriminator,Currency,Symbol,Conid,Country\nDividendDetail,Data,RevenueComponent,EUR,TST,1,FR,20241204,20241202,,Ordinary Dividend,Qualified,100,100,105,-25,-25,-26\nDividendDetail,Total,,EUR,,,,,,,,,100,100,105,-25,-25,-26';
    const entries = parseIbkrDividendCsv(onlyHeader);
    expect(entries).toHaveLength(0);
  });

  it('returns empty array for empty or invalid input', () => {
    expect(parseIbkrDividendCsv('')).toHaveLength(0);
    expect(parseIbkrDividendCsv('Account,Header\nAccount,Data,x,y,z')).toHaveLength(0);
  });

  it('returns empty array when CSV exceeds 600 KB', () => {
    const big = 'DividendDetail,Data,Summary,USD,TST,1,US,20240101,20240101,1,,,1,1,1,0,0,0\n' + 'x'.repeat(600 * 1024);
    expect(parseIbkrDividendCsv(big)).toHaveLength(0);
  });
});
