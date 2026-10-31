import { ProgressReviewApplicationService } from '@/applications/progress-review/progress-review-application-service';
import type { ICompanyHolidayRepository } from '@/applications/calendar/icompany-holiday-repository';

describe('ProgressReviewApplicationService', () => {
  const d = (ymd: string) => new Date(`${ymd}T00:00:00.000Z`);
  let companyHolidayRepository: { findByDateRange: jest.Mock };
  let service: ProgressReviewApplicationService;

  beforeEach(() => {
    companyHolidayRepository = { findByDateRange: jest.fn().mockResolvedValue([]) };
    service = new ProgressReviewApplicationService(
      companyHolidayRepository as unknown as ICompanyHolidayRepository
    );
  });

  it('週次は今日（JST）の7日前', async () => {
    // JST 2026-10-31 08:00（UTCでは前日）
    const result = await service.getPreviousReviewDate('WEEKLY', new Date('2026-10-30T23:00:00.000Z'));

    expect(result).toEqual(d('2026-10-24'));
  });

  it('日次は前営業日（会社休日も除く）', async () => {
    // 2026-11-02(月) の前営業日は 10/30(金) だが、会社休日なら 10/29(木)
    companyHolidayRepository.findByDateRange.mockResolvedValue([
      { date: d('2026-10-30'), name: '創立記念日', type: 'COMPANY' },
    ]);

    const result = await service.getPreviousReviewDate('DAILY', new Date('2026-11-02T03:00:00.000Z'));

    expect(result).toEqual(d('2026-10-29'));
  });
});
